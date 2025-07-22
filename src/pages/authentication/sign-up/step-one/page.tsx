import OnboardingTemplate from "../../../../components/templates/back/back"
import { IonLabel, useIonRouter } from "@ionic/react";
import { useState } from "react";
import { toast } from "react-toastify";
import TextInput from "../../../../components/input/text/input";
import Button from "../../../../components/button/button";


const Signup = () => {
  const router = useIonRouter();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
  });

  const [errors, setErrors] = useState({
    fullName: "",
    phone: "",
    address: "",
  });

  const validatePhone = (phone: string) => /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(phone);

  const validateField = (field: string, value: string) => {
    if (!value.trim()) return "This field is required";
    if (field === "phone" && !validatePhone(value)) return "Invalid phone number";
    if (field === "fullName" && value.length < 2) return "Name must be at least 2 characters";
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: validateField(name, value) });
  };

  const handleNext = () => {
    const newErrors = {
      fullName: validateField("fullName", formData.fullName),
      phone: validateField("phone", formData.phone),
      address: validateField("address", formData.address),
    };

    setErrors(newErrors);

    if (Object.values(newErrors).every((e) => !e)) {
      sessionStorage.setItem("coreDetails", JSON.stringify(formData));
      router.push("/auth/account", "forward", "replace");
    } else {
      toast.error("Please fix the errors before continuing.");
    }
  };

  return (
    <OnboardingTemplate titleOne="Complete your profile">
    <div className="p-4 gap-4 flex flex-col">
      <div className="flex flex-col gap-2">
        <IonLabel>Full Name</IonLabel>
        <TextInput
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Enter your full name"
          required
        />
        {errors.fullName && <span className="text-red-500 text-xs">{errors.fullName}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <IonLabel>Phone Number</IonLabel>
        <TextInput
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Enter your phone number"
          required
        />
        {errors.phone && <span className="text-red-500 text-xs">{errors.phone}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <IonLabel>Address</IonLabel>
        <TextInput
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Enter your address"
          required
        />
        {errors.address && <span className="text-red-500 text-xs">{errors.address}</span>}
      </div>

      <Button text="Next" onClick={handleNext} className="w-full mt-4" />
    </div>
  </OnboardingTemplate>
  )
}

export default Signup