import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ReportService, ReportData } from '../../services/report.service';
import { ReportViewComponent } from '../report-view/report-view.component';

@Component({
  selector: 'app-public-report-page',
  standalone: true,
  imports: [CommonModule, ReportViewComponent],
  templateUrl: './public-report-page.component.html',
  styleUrls: ['./public-report-page.component.css'],
})
export class PublicReportPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reportService = inject(ReportService);

  readonly report = signal<ReportData | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    void this.loadReport(token);
  }

  private async loadReport(token: string) {
    this.loading.set(true);
    const report = await this.reportService.fetchPublicReport(token);
    if (!report) {
      this.notFound.set(true);
    } else {
      this.report.set(report);
    }
    this.loading.set(false);
  }
}
