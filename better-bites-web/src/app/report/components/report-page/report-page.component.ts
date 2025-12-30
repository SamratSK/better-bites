import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { ReportService, ReportData } from '../../services/report.service';
import { ReportViewComponent } from '../report-view/report-view.component';

@Component({
  selector: 'app-report-page',
  standalone: true,
  imports: [CommonModule, ReportViewComponent],
  templateUrl: './report-page.component.html',
  styleUrls: ['./report-page.component.css'],
})
export class ReportPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly reportService = inject(ReportService);

  readonly report = signal<ReportData | null>(null);
  readonly loading = signal(true);
  readonly shareEnabled = signal(false);
  readonly shareToken = signal('');
  readonly shareLoading = signal(false);
  readonly linkCopied = signal(false);

  readonly shareLink = computed(() => {
    if (!this.shareToken()) {
      return '';
    }
    return `${window.location.origin}/report/share/${this.shareToken()}`;
  });

  ngOnInit(): void {
    void this.loadReport();
  }

  async loadReport() {
    this.loading.set(true);
    const report = await this.reportService.buildPrivateReport();
    this.report.set(report);
    this.loading.set(false);

    const user = this.authService.user();
    if (!user) {
      return;
    }
    const share = await this.reportService.getOrCreateShare(user.id);
    if (share) {
      this.shareEnabled.set(share.shareEnabled);
      this.shareToken.set(share.shareToken);
    }
  }

  async toggleShare() {
    const user = this.authService.user();
    if (!user) {
      return;
    }
    this.shareLoading.set(true);
    const share = await this.reportService.updateShareEnabled(user.id, !this.shareEnabled());
    if (share) {
      this.shareEnabled.set(share.shareEnabled);
      this.shareToken.set(share.shareToken);
    }
    this.shareLoading.set(false);
  }

  async copyShareLink() {
    if (!this.shareLink()) {
      return;
    }
    await navigator.clipboard.writeText(this.shareLink());
    this.linkCopied.set(true);
    setTimeout(() => this.linkCopied.set(false), 2000);
  }

  downloadPdf() {
    window.print();
  }
}
