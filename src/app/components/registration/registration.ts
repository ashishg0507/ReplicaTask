import { Component, signal, OnInit, OnDestroy, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormsModule } from '@angular/forms';
import { RegistrationService } from '../../registration.service';

interface District {
  name: string;
}

interface Town {
  name: string;
  districts: string[];
}

interface Parish {
  name: string;
  towns: Town[];
}

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './registration.html',
  styleUrl: './registration.css'
})
export class Registration implements OnInit, OnDestroy {
  // Stepper state
  // Steps: 
  // 0: Mobile Input
  // 0.1: OTP Input
  // 0.5: Terms & Conditions
  // 1: Personal Details
  // 2: Address
  // 3: Security & PIN
  // 4: Review
  // 5: Success
  public currentStep = signal<number>(0);
  
  // Validation trigger for fields
  public showErrors = signal<boolean>(false);

  // OTP Timer state
  public otpTimer = signal<number>(60);
  private timerInterval: any;
  public otpSent = signal<boolean>(false);

  // Address lookup data from JSON
  public parishesList = signal<Parish[]>([]);
  public townsList = signal<Town[]>([]);
  public districtsList = signal<string[]>([]);

  // Profile Picture base64 preview
  public profilePreview = signal<string>('');

  // ID Card Front/Back base64 previews
  public idFrontPreview = signal<string>('');
  public idBackPreview = signal<string>('');

  // Custom dropdown open states
  public activeDropdowns = signal<{[key: string]: boolean}>({});

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: Event): void {
    this.closeAllDropdowns();
  }

  public toggleDropdown(fieldName: string, event: Event): void {
    event.stopPropagation();
    const current = this.activeDropdowns();
    const newState = !current[fieldName];
    // Close other dropdowns
    const updated: {[key: string]: boolean} = {};
    updated[fieldName] = newState;
    this.activeDropdowns.set(updated);
  }

  public isDropdownOpen(fieldName: string): boolean {
    return !!this.activeDropdowns()[fieldName];
  }

  public closeAllDropdowns(): void {
    this.activeDropdowns.set({});
  }

  public getSelectedDisplayValue(groupName: string, fieldName: string, placeholder: string = 'Select'): string {
    const value = this.regService.regForm.get(`${groupName}.${fieldName}`)?.value;
    if (value === undefined || value === null || value === '') return placeholder;
    return value;
  }

  public selectOption(groupName: string, fieldName: string, value: string, event: Event): void {
    event.stopPropagation();
    const group = this.regService.regForm.get(groupName) as FormGroup;
    group.get(fieldName)?.setValue(value);
    group.get(fieldName)?.markAsTouched();

    if (fieldName === 'parish') {
      this.handleParishChangeManual(value);
    } else if (fieldName === 'town') {
      this.handleTownChangeManual(value);
    }

    this.closeAllDropdowns();
  }

  public handleParishChangeManual(selectedParishName: string): void {
    const pForm = this.regService.regForm.get('step4_address_id') as FormGroup;
    
    // Clear downstream selections
    pForm.patchValue({ town: '', district: '' });
    this.townsList.set([]);
    this.districtsList.set([]);

    if (selectedParishName) {
      const parish = this.parishesList().find(p => p.name === selectedParishName);
      if (parish) {
        this.townsList.set(parish.towns);
      }
    }
  }

  public handleTownChangeManual(selectedTownName: string): void {
    const pForm = this.regService.regForm.get('step4_address_id') as FormGroup;
    
    // Clear downstream selection
    pForm.patchValue({ district: '' });
    this.districtsList.set([]);

    if (selectedTownName) {
      const town = this.townsList().find(t => t.name === selectedTownName);
      if (town) {
        this.districtsList.set(town.districts);
      }
    }
  }

  constructor(public regService: RegistrationService) {}

  public ngOnInit(): void {
    this.loadJamaicaPlaces();

    // Preserve profile image preview if already loaded (on back navigation)
    const savedPic = this.regService.regForm.get('step2_personal.profilePicture')?.value;
    if (savedPic) {
      this.profilePreview.set(savedPic);
    }

    // Preserve ID Front/Back previews if already loaded
    const savedFront = this.regService.regForm.get('step4_address_id.idFront')?.value;
    if (savedFront) {
      this.idFrontPreview.set(savedFront);
    }
    const savedBack = this.regService.regForm.get('step4_address_id.idBack')?.value;
    if (savedBack) {
      this.idBackPreview.set(savedBack);
    }
  }

  public ngOnDestroy(): void {
    this.stopTimer();
  }

  // Fetch parishes, towns, and districts from our JSON file
  private async loadJamaicaPlaces(): Promise<void> {
    try {
      const response = await fetch('/data/jamaica-places.json');
      const data = await response.json();
      this.parishesList.set(data.parishes);
      
      // Wire up cascading change handlers manually for reactivity if already filled
      this.rehydrateAddressDropdowns();
    } catch (error) {
      console.error('Error loading Jamaica places JSON', error);
    }
  }

  // Pre-fill dropdown lists if they have values already (from back navigation)
  private rehydrateAddressDropdowns(): void {
    const pForm = this.regService.regForm.get('step4_address_id') as FormGroup;
    if (!pForm) return;
    const parish = pForm.get('parish')?.value;
    const town = pForm.get('town')?.value;

    if (parish) {
      const foundParish = this.parishesList().find(p => p.name === parish);
      if (foundParish) {
        this.townsList.set(foundParish.towns);
        if (town) {
          const foundTown = foundParish.towns.find(t => t.name === town);
          if (foundTown) {
            this.districtsList.set(foundTown.districts);
          }
        }
      }
    }
  }

  // Triggered when Parish selection changes
  public onParishChange(event: Event): void {
    const selectedParishName = (event.target as HTMLSelectElement).value;
    const pForm = this.regService.regForm.get('step4_address_id') as FormGroup;
    
    // Clear downstream selections
    pForm.patchValue({ town: '', district: '' });
    this.townsList.set([]);
    this.districtsList.set([]);

    if (selectedParishName) {
      const parish = this.parishesList().find(p => p.name === selectedParishName);
      if (parish) {
        this.townsList.set(parish.towns);
      }
    }
  }

  // Triggered when Town selection changes
  public onTownChange(event: Event): void {
    const selectedTownName = (event.target as HTMLSelectElement).value;
    const pForm = this.regService.regForm.get('step4_address_id') as FormGroup;
    
    // Clear downstream selection
    pForm.patchValue({ district: '' });
    this.districtsList.set([]);

    if (selectedTownName) {
      const town = this.townsList().find(t => t.name === selectedTownName);
      if (town) {
        this.districtsList.set(town.districts);
      }
    }
  }

  // Helper to get active subgroup
  public getActiveFormGroup(): FormGroup {
    const step = this.currentStep();
    if (step === 0 || step === 0.1) {
      return this.regService.regForm.get('step1_mobile') as FormGroup;
    } else if (step === 1) {
      return this.regService.regForm.get('step2_personal') as FormGroup;
    } else if (step === 2) {
      return this.regService.regForm.get('step3_security') as FormGroup;
    } else if (step === 3) {
      return this.regService.regForm.get('step4_address_id') as FormGroup;
    }
    return this.regService.regForm;
  }

  // Trigger verification check of a single input field
  public isFieldInvalid(groupName: string, fieldName: string): boolean {
    const control = this.regService.regForm.get(`${groupName}.${fieldName}`);
    return !!(control && control.invalid && (control.touched || this.showErrors()));
  }

  // Display specific field errors
  public getFieldError(groupName: string, fieldName: string): string {
    const control = this.regService.regForm.get(`${groupName}.${fieldName}`);
    if (control && control.errors) {
      const firstError = Object.keys(control.errors)[0];
      if (firstError === 'required') return 'Please fill this field to continue';
      if (firstError === 'invalidMobile') return control.errors['invalidMobile'];
      if (firstError === 'underEighteen') return control.errors['underEighteen'];
      if (firstError === 'invalidTrn') return control.errors['invalidTrn'];
      if (firstError === 'notFutureDate') return control.errors['notFutureDate'];
      if (firstError === 'email') return 'Please enter a valid email address.';
      if (firstError === 'pattern') {
        if (fieldName === 'verificationCode') return 'Verification code must be 6 digits.';
        if (fieldName === 'pin') return 'PIN must be exactly 4 digits.';
      }
      if (firstError === 'pinMismatch') return control.errors['pinMismatch'];
      if (firstError === 'sameQuestion') return control.errors['sameQuestion'];
    }
    return '';
  }

  // OTP Verification Actions
  public sendVerificationCode(): void {
    const group = this.regService.regForm.get('step1_mobile') as FormGroup;
    
    // Validate countryCode & mobileNumber
    group.get('countryCode')?.markAsTouched();
    group.get('mobileNumber')?.markAsTouched();

    if (group.get('countryCode')?.valid && group.get('mobileNumber')?.valid) {
      this.showErrors.set(false);
      this.currentStep.set(0.1); // Move to OTP entry
      this.otpSent.set(true);
      this.startTimer();
    } else {
      this.showErrors.set(true);
    }
  }

  public verifyCode(): void {
    const group = this.regService.regForm.get('step1_mobile') as FormGroup;
    group.get('verificationCode')?.markAsTouched();

    if (group.get('verificationCode')?.valid) {
      this.stopTimer();
      this.showErrors.set(false);
      this.currentStep.set(0.5); // Move to static terms
    } else {
      this.showErrors.set(true);
    }
  }

  // OTP Countdown timer methods
  private startTimer(): void {
    this.stopTimer();
    this.otpTimer.set(60);
    this.timerInterval = setInterval(() => {
      this.otpTimer.update(t => {
        if (t <= 1) {
          this.stopTimer();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  public resendCode(): void {
    if (this.otpTimer() === 0) {
      this.startTimer();
      // Mock code refresh
      this.regService.regForm.get('step1_mobile.verificationCode')?.reset();
    }
  }

  public clearReferralCode(): void {
    this.regService.regForm.get('step1_mobile.referralCode')?.setValue('');
  }

  // Terms and conditions
  public acceptTerms(): void {
    this.currentStep.set(1); // Proceed to Personal Details (Step 2)
  }

  public declineTerms(): void {
    this.currentStep.set(0); // Return to Mobile Verification
    this.regService.regForm.get('step1_mobile.verificationCode')?.setValue('');
  }

  // Profile picture file loader (JPG, JPEG, PNG validation & Base64 read)
  public onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // Format validation
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        alert('Allowed document formats are : jpg, jpeg, png');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        this.profilePreview.set(base64String);
        this.regService.regForm.get('step2_personal.profilePicture')?.setValue(base64String);
      };
      reader.readAsDataURL(file);
    }
  }

  // ID Front & Back file uploaders
  public onIdFileSelected(event: Event, side: 'front' | 'back'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        alert('Allowed document formats are : jpg, jpeg, png');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        if (side === 'front') {
          this.idFrontPreview.set(base64String);
          this.regService.regForm.get('step4_address_id.idFront')?.setValue(base64String);
          this.regService.regForm.get('step4_address_id.idFront')?.markAsTouched();
        } else {
          this.idBackPreview.set(base64String);
          this.regService.regForm.get('step4_address_id.idBack')?.setValue(base64String);
          this.regService.regForm.get('step4_address_id.idBack')?.markAsTouched();
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Navigation handlers
  public saveAndContinue(): void {
    const step = this.currentStep();
    const currentGroup = this.getActiveFormGroup();

    // Mark all fields in active group as touched to trigger validators
    currentGroup.markAllAsTouched();

    if (currentGroup.valid) {
      this.showErrors.set(false);
      // Increment step
      this.currentStep.set(step + 1);
      // Rehydrate lists if navigating into Permanent Address & ID (Step 4, which has step number 3)
      if (this.currentStep() === 3) {
        this.rehydrateAddressDropdowns();
      }
    } else {
      this.showErrors.set(true);
      // Scroll to first invalid element
      setTimeout(() => {
        const firstInvalid = document.querySelector('.has-error');
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  }

  public goBack(): void {
    const step = this.currentStep();
    this.showErrors.set(false);

    if (step === 0.1) {
      this.stopTimer();
      this.currentStep.set(0);
    } else if (step === 0.5) {
      this.currentStep.set(0.1);
      this.startTimer();
    } else if (step === 1) {
      this.currentStep.set(0.5);
    } else {
      this.currentStep.set(step - 1);
      if (this.currentStep() === 3) {
        this.rehydrateAddressDropdowns();
      }
    }
  }

  public submitRegistration(): void {
    // Ultimate validation of the full form
    this.regService.regForm.markAllAsTouched();
    if (this.regService.regForm.valid) {
      this.currentStep.set(5); // Show success screen
    } else {
      alert('Some form fields are invalid. Please check your data.');
    }
  }

  public startOver(): void {
    this.regService.resetForm();
    this.profilePreview.set('');
    this.idFrontPreview.set('');
    this.idBackPreview.set('');
    this.currentStep.set(0);
    this.showErrors.set(false);
    this.otpSent.set(false);
  }

  // Helpers to get form display values for review screen
  public getFormValue(path: string): string {
    const val = this.regService.regForm.get(path)?.value;
    if (val === undefined || val === null || val === '') return 'N/A';
    return val;
  }
}
