import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  public regForm: FormGroup;
  
  // Custom lookups
  public countryCodes = [
    { code: '+1 (JM)', country: 'Jamaica' },
    { code: '+91 (IN)', country: 'India' }
  ];

  public genders = ['Male', 'Female', 'Other'];

  public countries = ['Jamaica', 'India', 'United States', 'Canada', 'United Kingdom'];

  public nationalities = ['Jamaican', 'Indian', 'American', 'Canadian', 'British'];

  public securityQuestions = [
    'What is your mother\'s maiden name?',
    'What was the name of your first pet?',
    'What is your favorite book?',
    'What city were you born in?',
    'What was the name of your primary school?'
  ];

  constructor(private fb: FormBuilder) {
    this.regForm = this.fb.group({
      step1_mobile: this.fb.group({
        countryCode: ['+1 (JM)', Validators.required],
        mobileNumber: ['', [Validators.required, this.mobileNumberValidator()]],
        verificationCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
        referralCode: ['']
      }),
      step2_personal: this.fb.group({
        profilePicture: [''], // base64 string
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        middleName: [''],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        dateOfBirth: ['', [Validators.required, this.eighteenYearsOldValidator()]],
        gender: ['', Validators.required],
        countryOfBirth: ['', Validators.required],
        nationality: ['', Validators.required]
      }),
      step3_security: this.fb.group({
        question1: ['', Validators.required],
        answer1: ['', Validators.required],
        question2: ['', Validators.required],
        answer2: ['', Validators.required],
        pin: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
        confirmPin: ['', Validators.required]
      }, {
        validators: [this.pinMatchValidator(), this.distinctQuestionsValidator()]
      }),
      step4_address_id: this.fb.group({
        streetAddress: ['', Validators.required],
        apartmentSuite: [''],
        parish: ['', Validators.required],
        town: ['', Validators.required],
        district: ['', Validators.required],
        emailAddress: ['', [Validators.required, Validators.email]],
        trnNumber: ['', [Validators.required, this.trnValidator()]],
        idType: ['', Validators.required],
        idNumber: ['', Validators.required],
        expirationDate: ['', [Validators.required, this.futureDateValidator()]],
        idFront: ['', Validators.required], // base64 string
        idBack: ['', Validators.required], // base64 string
        topUpOption: ['digital', Validators.required] // digital or retail
      })
    });
  }

  // --- CUSTOM VALIDATORS ---

  // Mobile number validation (matches jamaica 7-digit or india 10-digit, numeric)
  private mobileNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const cleanVal = control.value.replace(/[-\s]/g, '');
      const parent = control.parent;
      const countryCode = parent?.get('countryCode')?.value || '+1 (JM)';

      // Jamaica numbers are 7-digit locally (excluding area code if entered, usually formatted as 3-digit area + 7 digit local)
      // Standard mobile length is 10 digits total or 7 digits local
      if (countryCode.includes('JM')) {
        // Jamaica digits count: cleanVal should be 7 or 10 digits
        const isNumeric = /^\d+$/.test(cleanVal);
        if (!isNumeric || (cleanVal.length !== 7 && cleanVal.length !== 10)) {
          return { invalidMobile: 'Please enter a valid 7 or 10 digit Jamaican number.' };
        }
      } else if (countryCode.includes('IN')) {
        // India mobile numbers are exactly 10 digits
        const isNumeric = /^\d{10}$/.test(cleanVal);
        if (!isNumeric) {
          return { invalidMobile: 'Please enter a valid 10-digit Indian number.' };
        }
      }
      return null;
    };
  }

  // 18+ Date of Birth validator
  private eighteenYearsOldValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const dob = new Date(control.value);
      if (isNaN(dob.getTime())) return null;

      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const dayDiff = today.getDate() - dob.getDate();

      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }

      if (age < 18) {
        return { underEighteen: 'You must be at least 18 years of age to register.' };
      }
      return null;
    };
  }

  // TRN Number Validator (9 digits, only numbers)
  private trnValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const val = control.value.trim();
      const isNineDigitsOnly = /^\d{9}$/.test(val);

      if (!isNineDigitsOnly) {
        return { invalidTrn: 'TRN number must be exactly 9 digits and contain only numbers.' };
      }
      return null;
    };
  }

  // Expiration date only future date
  private futureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const selectedDate = new Date(control.value);
      if (isNaN(selectedDate.getTime())) return null;

      const today = new Date();
      // Set hours to 0 to compare dates only
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate <= today) {
        return { notFutureDate: 'Expiration date must be a future date.' };
      }
      return null;
    };
  }

  // Distinct questions validator (applied to FormGroup)
  private distinctQuestionsValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const group = control as FormGroup;
      const q1 = group.get('question1')?.value;
      const q2 = group.get('question2')?.value;

      if (q1 && q2 && q1 === q2) {
        group.get('question2')?.setErrors({ sameQuestion: 'Same question cannot be selected for both fields.' });
        return { sameQuestion: true };
      }
      
      // If they were same but now different, clear errors if there were no other errors on question2
      const q2Errors = group.get('question2')?.errors;
      if (q2Errors && q2Errors['sameQuestion']) {
        delete q2Errors['sameQuestion'];
        const remaining = Object.keys(q2Errors).length;
        group.get('question2')?.setErrors(remaining > 0 ? q2Errors : null);
      }

      return null;
    };
  }

  // PIN match validator (applied to FormGroup)
  private pinMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const group = control as FormGroup;
      const pin = group.get('pin')?.value;
      const confirmPin = group.get('confirmPin')?.value;

      if (pin && confirmPin && pin !== confirmPin) {
        group.get('confirmPin')?.setErrors({ pinMismatch: 'Account PIN and confirm PIN should be same.' });
        return { pinMismatch: true };
      }

      // If they match now, clear errors if there were no other errors on confirmPin
      const confirmErrors = group.get('confirmPin')?.errors;
      if (confirmErrors && confirmErrors['pinMismatch']) {
        delete confirmErrors['pinMismatch'];
        const remaining = Object.keys(confirmErrors).length;
        group.get('confirmPin')?.setErrors(remaining > 0 ? confirmErrors : null);
      }

      return null;
    };
  }

  // Clean form state
  public resetForm(): void {
    this.regForm.reset({
      step1_mobile: {
        countryCode: '+1 (JM)',
        mobileNumber: '',
        verificationCode: '',
        referralCode: ''
      },
      step2_personal: {
        profilePicture: '',
        firstName: '',
        middleName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        countryOfBirth: '',
        nationality: ''
      },
      step3_security: {
        question1: '',
        answer1: '',
        question2: '',
        answer2: '',
        pin: '',
        confirmPin: ''
      },
      step4_address_id: {
        streetAddress: '',
        apartmentSuite: '',
        parish: '',
        town: '',
        district: '',
        emailAddress: '',
        trnNumber: '',
        idType: '',
        idNumber: '',
        expirationDate: '',
        idFront: '',
        idBack: '',
        topUpOption: 'digital'
      }
    });
  }
}
