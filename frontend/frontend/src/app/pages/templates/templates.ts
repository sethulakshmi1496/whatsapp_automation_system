import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { HeaderComponent } from '../../components/header/header';
import { TemplateService } from '../../services/template';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './templates.html',
  styleUrl: './templates.css'
})
export class TemplatesComponent implements OnInit {
  templates: any[] = [];
  showModal: boolean = false;
  editingTemplate: any = null;

  formData = {
    title: '',
    body: '',
    category: '',
    media_url: ''
  };

  previewBody: string = '';
  sampleData = { name: 'John Doe', phone: '1234567890' };

  constructor(private templateService: TemplateService) { }

  ngOnInit() {
    this.loadTemplates();
  }

  loadTemplates() {
    console.log('[TemplatesComponent] Loading templates...');
    this.templateService.getAll().subscribe({
      next: (data) => {
        console.log('[TemplatesComponent] Templates loaded:', data);
        console.log('[TemplatesComponent] Templates count:', data.length);
        this.templates = data;
      },
      error: (error) => {
        console.error('[TemplatesComponent] Error loading templates:', error);
      }
    });
  }

  openModal(template?: any) {
    if (template) {
      this.editingTemplate = template;
      this.formData = { ...template };
    } else {
      this.editingTemplate = null;
      this.formData = { title: '', body: '', category: '', media_url: '' };
    }
    this.updatePreview();
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingTemplate = null;
  }

  updatePreview() {
    this.previewBody = this.formData.body
      .replace(/{{name}}/g, this.sampleData.name)
      .replace(/{{phone}}/g, this.sampleData.phone);
  }

  saveTemplate() {
    if (this.editingTemplate) {
      this.templateService.update(this.editingTemplate.id, this.formData).subscribe(() => {
        this.loadTemplates();
        this.closeModal();
      });
    } else {
      this.templateService.create(this.formData).subscribe(() => {
        this.loadTemplates();
        this.closeModal();
      });
    }
  }

  deleteTemplate(id: number) {
    if (confirm('Are you sure you want to delete this template?')) {
      this.templateService.delete(id).subscribe(() => {
        this.loadTemplates();
      });
    }
  }
}
