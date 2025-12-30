import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { Component, Input } from '@angular/core';

import type { ReportData } from '../../services/report.service';

@Component({
  selector: 'app-report-view',
  standalone: true,
  imports: [CommonModule, DatePipe, TitleCasePipe],
  templateUrl: './report-view.component.html',
  styleUrls: ['./report-view.component.css'],
})
export class ReportViewComponent {
  @Input({ required: true }) report!: ReportData;

  get bmiValue(): number | null {
    const measurement = this.report.measurement;
    if (!measurement || !measurement.heightCm || !measurement.weightKg) {
      return null;
    }
    const heightM = measurement.heightCm / 100;
    return heightM > 0 ? measurement.weightKg / (heightM * heightM) : null;
  }
}
