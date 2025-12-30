import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminService } from '../../../core/services/admin.service';
import type { ReportData } from '../../../report/services/report.service';
import { ReportViewComponent } from '../../../report/components/report-view/report-view.component';

@Component({
  selector: 'app-admin-report-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReportViewComponent],
  templateUrl: './admin-report-page.component.html',
  styleUrls: ['./admin-report-page.component.css'],
})
export class AdminReportPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);

  readonly report = signal<ReportData | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (!userId) {
      void this.router.navigate(['/admin']);
      return;
    }
    void this.loadReport(userId);
  }

  private async loadReport(userId: string) {
    this.loading.set(true);
    const report = await this.adminService.fetchUserReport(userId);
    this.report.set(report);
    this.loading.set(false);
  }
}
