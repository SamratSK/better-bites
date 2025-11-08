import { TitleCasePipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from 'three';

@Component({
  selector: 'app-avatar-canvas',
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './avatar-canvas.component.html',
  styleUrl: './avatar-canvas.component.css',
})
export class AvatarCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) bmi = 22;
  @Input() gender: 'male' | 'female' = 'male';

  @ViewChild('canvas', { static: true }) private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: any;
  private scene!: any;
  private camera!: any;
  private avatarGroup!: any;
  private animationFrameId = 0;

  readonly bmiCategory = signal('healthy');

  ngAfterViewInit(): void {
    this.setupScene();
    this.updateAvatarAppearance();
    this.animate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['bmi'] && !changes['bmi'].firstChange) || (changes['gender'] && !changes['gender'].firstChange)) {
      this.updateAvatarAppearance();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.renderer?.dispose();
  }

  private setupScene() {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.scene = new Scene();
    this.scene.background = null;

    const baseColor = this.gender === 'female' ? new Color('#fda4af') : new Color('#93c5fd');

    const ambient = new AmbientLight(0xffffff, 0.7);
    const directional = new DirectionalLight(0xffffff, 0.8);
    directional.position.set(2, 3, 4);

    this.scene.add(ambient, directional);

    this.camera = new PerspectiveCamera(35, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 1.5, 6);

    this.avatarGroup = new Group();

    const torsoMaterial = new MeshStandardMaterial({ color: baseColor, metalness: 0.1, roughness: 0.8 });
    const headMaterial = torsoMaterial.clone();

    const torso = new Mesh(new SphereGeometry(1, 32, 32), torsoMaterial);
    torso.scale.set(1.3, 1.6, 1.1);
    torso.position.y = 1.2;

    const head = new Mesh(new SphereGeometry(0.5, 32, 32), headMaterial);
    head.position.y = 2.5;

    this.avatarGroup.add(torso, head);

    this.scene.add(this.avatarGroup);
  }

  private remixForBmi(bmi: number) {
    if (bmi < 18.5) {
      return 'underweight';
    }
    if (bmi < 25) {
      return 'healthy';
    }
    if (bmi < 30) {
      return 'overweight';
    }
    return 'obese';
  }

  private updateAvatarAppearance() {
    if (!this.avatarGroup) {
      return;
    }

    const category = this.remixForBmi(this.bmi);
    this.bmiCategory.set(category);

    const scaleMap: Record<string, number> = {
      underweight: 0.85,
      healthy: 1,
      overweight: 1.12,
      obese: 1.25,
    };

    const torso = this.avatarGroup.children[0] as any;
    torso.scale.set(1.3 * scaleMap[category], 1.6 * scaleMap[category], 1.1 * scaleMap[category]);

    const head = this.avatarGroup.children[1] as any;
    head.scale.setScalar(1 + (this.bmi - 22) * 0.01);
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    if (this.avatarGroup) {
      this.avatarGroup.rotation.y += 0.01;
    }
    this.renderer.render(this.scene, this.camera);
  };
}
