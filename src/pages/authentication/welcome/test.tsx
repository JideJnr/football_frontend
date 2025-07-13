

const Test = () => {


  return (
    <ion-page>

    
    <ion-header>
  <ion-toolbar>
    <ion-title class="text-center text-lg font-semibold">Central Pharmacy</ion-title>
    <div class="text-center text-sm text-gray-500">334 Central Ave, Brooklyn</div>
  </ion-toolbar>
</ion-header>

<ion-content class="ion-padding">
  <div class="max-w-md mx-auto p-4 bg-white rounded-xl shadow-md mt-4">
    <h2 class="text-xl font-semibold text-center mb-1">Enter your details</h2>
    <p class="text-center text-xs text-gray-500 mb-4">Times shown in (GMT-4) New York</p>

    <form (ngSubmit)="submitForm()" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <ion-input
          fill="outline"
          label="First Name"
          labelPlacement="floating"
          class="rounded-md"
          [(ngModel)]="form.firstName"
          name="firstName"
          required>
        </ion-input>

        <ion-input
          fill="outline"
          label="Last Name"
          labelPlacement="floating"
          class="rounded-md"
          [(ngModel)]="form.lastName"
          name="lastName"
          required>
        </ion-input>
      </div>

      <ion-input
        fill="outline"
        label="Mobile Number"
        labelPlacement="floating"
        class="rounded-md"
        [(ngModel)]="form.mobileNumber"
        name="mobileNumber"
        type="tel"
        required>
      </ion-input>

      <ion-input
        fill="outline"
        label="Email Address"
        labelPlacement="floating"
        class="rounded-md"
        [(ngModel)]="form.email"
        name="email"
        type="email"
        required>
      </ion-input>

      <ion-textarea
        fill="outline"
        label="Additional Info"
        labelPlacement="floating"
        class="rounded-md"
        [(ngModel)]="form.additionalInfo"
        name="additionalInfo">
      </ion-textarea>

      <ion-button
        expand="block"
        class="bg-lime-400 text-black rounded-xl hover:bg-lime-500"
        type="submit">
        Continue →
      </ion-button>
    </form>
  </div>
</ion-content>

</ion-page>

  )
}

export default Test