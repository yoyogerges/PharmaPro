import { Directive, inject, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';

@Directive({ selector: '[appHasPermission]', standalone: true })
export class PermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);
  private hasView = false;

  set appHasPermission(permission: string) {
    const allowed = this.authService.hasPermission(permission);
    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

@Directive({ selector: '[appHasAnyPermission]', standalone: true })
export class HasAnyPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);
  private hasView = false;

  set appHasAnyPermission(permissions: string[]) {
    const allowed = this.authService.hasAnyPermission(...permissions);
    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}