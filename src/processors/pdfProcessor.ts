import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { Contact, PDFProcessingResult } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class PDFProcessor {
  private worker: Tesseract.Worker | null = null;

  async initialize(): Promise<void> {
    this.worker = await Tesseract.createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  async processPDF(pdfBuffer: Buffer): Promise<PDFProcessingResult> {
    let text = '';
    let wasOCR = false;
    
    try {
      const data = await pdfParse(pdfBuffer);
      text = data.text || '';
      
      if (data.info) {
        console.log(`PDF Info: ${data.info.Title || 'No title'}, Pages: ${data.numpages}`);
      }
    } catch (error) {
      console.log('PDF parse failed, will try OCR');
    }
    
    if (!text || text.trim().length < 100) {
      console.log('PDF has no extractable text, using OCR...');
      text = await this.performOCR(pdfBuffer);
      wasOCR = true;
    }
    
    const contacts = this.extractContactsFromText(text);
    
    return {
      text,
      contacts,
      wasOCR
    };
  }

  async processPDFFromFile(filePath: string): Promise<PDFProcessingResult> {
    const buffer = await fs.readFile(filePath);
    return this.processPDF(buffer);
  }

  private async performOCR(pdfBuffer: Buffer): Promise<string> {
    if (!this.worker) {
      await this.initialize();
    }
    
    const tempDir = path.join(process.cwd(), '.temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const pdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
    await fs.writeFile(pdfPath, pdfBuffer);
    
    try {
      const { data: { text } } = await this.worker!.recognize(pdfPath);
      return text;
    } finally {
      await fs.unlink(pdfPath).catch(() => {});
    }
  }

  private extractContactsFromText(text: string): Contact[] {
    const contacts: Contact[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    
    const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const nameRegex = /^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/;
    
    const titleKeywords = [
      'director', 'manager', 'supervisor', 'coordinator', 'administrator',
      'superintendent', 'assistant', 'chief', 'head', 'lead', 'specialist',
      'facilities', 'maintenance', 'operations', 'purchasing', 'procurement',
      'business', 'finance', 'hr', 'human resources', 'technology', 'it'
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const emails = line.match(emailRegex) || [];
      
      if (emails.length > 0) {
        for (const email of emails) {
          let firstName = '';
          let lastName = '';
          let title = '';
          let phone = '';
          let department = '';
          
          for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 5); j++) {
            const nearbyLine = lines[j];
            
            const nameMatch = nearbyLine.match(nameRegex);
            if (nameMatch && !firstName) {
              firstName = nameMatch[1];
              lastName = nameMatch[2];
            }
            
            const phoneMatch = nearbyLine.match(phoneRegex);
            if (phoneMatch && !phone) {
              phone = phoneMatch[0];
            }
            
            const lowerLine = nearbyLine.toLowerCase();
            if (titleKeywords.some(keyword => lowerLine.includes(keyword))) {
              if (!title) {
                title = nearbyLine;
              }
              
              if (lowerLine.includes('facilities') || lowerLine.includes('maintenance')) {
                department = 'Facilities';
              } else if (lowerLine.includes('business') || lowerLine.includes('finance')) {
                department = 'Business';
              } else if (lowerLine.includes('technology') || lowerLine.includes('it')) {
                department = 'Technology';
              }
            }
          }
          
          contacts.push({
            firstName,
            lastName,
            title: title || 'Staff',
            email,
            phone: phone || undefined,
            department: department || undefined,
            confidence: (firstName && lastName && title) ? 95 : 75
          });
        }
      }
    }
    
    return this.deduplicateContacts(contacts);
  }

  private deduplicateContacts(contacts: Contact[]): Contact[] {
    const seen = new Set<string>();
    const unique: Contact[] = [];
    
    for (const contact of contacts) {
      const key = contact.email || `${contact.firstName}-${contact.lastName}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(contact);
      }
    }
    
    return unique;
  }
}