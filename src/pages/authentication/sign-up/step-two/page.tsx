
import OnboardingTemplate from "../../../../components/templates/back/back"
import { IonInput, IonLabel, useIonRouter } from "@ionic/react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Button from "../../../../components/button/button";
import TextInput from "../../../../components/input/text/input";
import { useAuth } from "../../../../contexts/useAuthContext";

const SignupContinue = () => {
  const router = useIonRouter();
  
  const { signup, loading, error: authError } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [coreDetails, setCoreDetails] = useState<any>(null);

  
  useEffect(() => {
    const stored = sessionStorage.getItem("coreDetails");
    if (stored) setCoreDetails(JSON.parse(stored));
    else router.push("/auth/profile", "back", "replace");
  }, []);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = () => {
    const newErrors = {
      email: !formData.email ? "Email is required" : !validateEmail(formData.email) ? "Invalid email format" : "",
      password: formData.password.length < 6 ? "Password must be at least 6 characters" : "",
      confirmPassword: formData.confirmPassword !== formData.password ? "Passwords do not match" : "",
    };
    setErrors(newErrors);
    return Object.values(newErrors).every((e) => !e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };


  const handleSubmit = async () => {
    if (!validateForm()) return;
  
    const completeData = { ...coreDetails, ...formData };
  
    try {
      console.log("Submitting:", completeData);
      await signup(completeData);
      sessionStorage.removeItem("coreDetails");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create account. Please try again."); // ✅ rely on caught error
    }
  };
  


  return (
    <OnboardingTemplate titleOne="Create your account">
    <div className="p-4 gap-4 flex flex-col">
      <div className="flex flex-col gap-2">
        <IonLabel>Email</IonLabel>
        <TextInput
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
        />
        {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <IonLabel>Password</IonLabel>
        <TextInput
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Create a password"
          required
        />
        {errors.password && <span className="text-red-500 text-xs">{errors.password}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <IonLabel>Confirm Password</IonLabel>
        <TextInput
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your password"
          required
        />
        {errors.confirmPassword && <span className="text-red-500 text-xs">{errors.confirmPassword}</span>}
      </div>

      <Button text="Create Account" onClick={handleSubmit} className="w-full mt-4"  loading={loading} loadingText="Creating Account..."/>
    </div>
  </OnboardingTemplate>
  )
}

export default SignupContinue