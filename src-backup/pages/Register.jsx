import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    city: "",
    country: "",
    email: "",
    password: "",
    confirmPassword: "",
    freeFireId: "",
    idCard: null,
    selfie: null
  });

  const [previews, setPreviews] = useState({
    idCard: null,
    selfie: null
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setFormData({
      ...formData,
      [type]: file
    });

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews({
        ...previews,
        [type]: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const openCamera = (type, facingMode) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = facingMode;
    input.onchange = (e) => handleFileChange(e, type);
    input.click();
  };

  const validateStep1 = () => {
    if (!formData.fullName) {
      setError("Full name is required");
      return false;
    }
    if (!formData.age || formData.age < 13) {
      setError("Age must be at least 13");
      return false;
    }
    if (!formData.city) {
      setError("City is required");
      return false;
    }
    if (!formData.country) {
      setError("Country is required");
      return false;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Invalid email address");
      return false;
    }
    if (!formData.freeFireId) {
      setError("Free Fire ID is required");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.idCard) {
      setError("ID Card is required");
      return false;
    }
    if (!formData.selfie) {
      setError("Selfie with ID is required");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError("");
    if (validateStep1()) {
      setStep(2);
    }
  };

  const uploadFile = async (file, userId, folder) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${folder}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("verification-docs")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("verification-docs")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateStep2()) return;

    setLoading(true);
    setSuccess("Creating your account...");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error("Failed to create user");

      setSuccess("Account created! Uploading documents...");

      const idCardUrl = await uploadFile(formData.idCard, user.id, "id-cards");
      const selfieUrl = await uploadFile(formData.selfie, user.id, "selfies");

      setSuccess("Documents uploaded! Updating profile...");

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name: formData.fullName,
            age: parseInt(formData.age),
            city: formData.city,
            country: formData.country,
            free_fire_id: formData.freeFireId,
            id_card_url: idCardUrl,
            selfie_url: selfieUrl,
            role: "pending_verification",
            verification_status: "pending",
            coins: 0
          },
          { onConflict: "id" }
        );

      if (upsertError) throw upsertError;

      setSuccess("✅ Registration complete! Redirecting to login...");
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black text-white p-4">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Join CipherPool
          </h1>
          <p className="text-gray-400">Create your account to start competing</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? "text-purple-400" : "text-gray-600"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step >= 1 ? "border-purple-400 bg-purple-400/20" : "border-gray-600"
              }`}>
                1
              </div>
              <span>Information</span>
            </div>
            <div className={`w-16 h-0.5 ${step >= 2 ? "bg-purple-400" : "bg-gray-600"}`}></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? "text-cyan-400" : "text-gray-600"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step >= 2 ? "border-cyan-400 bg-cyan-400/20" : "border-gray-600"
              }`}>
                2
              </div>
              <span>Verification</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
            {success}
          </div>
        )}

        <div className="bg-slate-900/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8">

          {step === 1 ? (
            <div className="space-y-4">
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                onChange={handleChange}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  name="age"
                  placeholder="Age"
                  onChange={handleChange}
                  className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
                />
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  onChange={handleChange}
                  className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
                />
              </div>

              <input
                type="text"
                name="country"
                placeholder="Country"
                onChange={handleChange}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
              />

              <input
                type="text"
                name="freeFireId"
                placeholder="Free Fire ID"
                onChange={handleChange}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
              />

              <input
                type="email"
                name="email"
                placeholder="Email"
                onChange={handleChange}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  onChange={handleChange}
                  className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
                />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  onChange={handleChange}
                  className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
                />
              </div>

              <button
                onClick={handleNextStep}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-bold hover:opacity-90 transition"
              >
                Next Step →
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-400">
                  Carte Nationale (ID Card) *
                </label>
                
                <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <h4 className="text-yellow-400 font-bold mb-2">📸 ID Card Instructions</h4>
                  <ul className="text-sm text-gray-300 list-disc ml-4">
                    <li>Place your ID card on a flat surface</li>
                    <li>Make sure all 4 corners are visible</li>
                    <li>Ensure good lighting and no glare</li>
                    <li>The photo must be clear and readable</li>
                  </ul>
                </div>

                {previews.idCard && (
                  <div className="mb-4">
                    <img
                      src={previews.idCard}
                      alt="ID Card Preview"
                      className="w-full max-h-48 object-contain rounded-lg border-2 border-purple-500/30"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => handleFileChange(e, 'idCard');
                      input.click();
                    }}
                    className="py-2 bg-slate-800 border border-purple-500/30 rounded-lg hover:bg-slate-700 transition"
                  >
                    📁 Choose from library
                  </button>
                  <button
                    type="button"
                    onClick={() => openCamera('idCard', 'environment')}
                    className="py-2 bg-purple-600/20 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition"
                  >
                    📸 Take photo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-cyan-400">
                  Selfie with ID Card *
                </label>
                
                <div className="mb-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <h4 className="text-cyan-400 font-bold mb-2">🤳 Selfie Instructions</h4>
                  <ul className="text-sm text-gray-300 list-disc ml-4">
                    <li>Hold your ID card next to your face</li>
                    <li>Both your face and the ID must be clearly visible</li>
                    <li>Make sure the ID details are readable</li>
                    <li>Good lighting is essential</li>
                  </ul>
                </div>

                {previews.selfie && (
                  <div className="mb-4">
                    <img
                      src={previews.selfie}
                      alt="Selfie Preview"
                      className="w-full max-h-48 object-contain rounded-lg border-2 border-cyan-500/30"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => handleFileChange(e, 'selfie');
                      input.click();
                    }}
                    className="py-2 bg-slate-800 border border-cyan-500/30 rounded-lg hover:bg-slate-700 transition"
                  >
                    📁 Choose from library
                  </button>
                  <button
                    type="button"
                    onClick={() => openCamera('selfie', 'user')}
                    className="py-2 bg-cyan-600/20 border border-cyan-500/30 rounded-lg hover:bg-cyan-600/30 transition"
                  >
                    📸 Take photo
                  </button>
                </div>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-sm text-gray-300">
                  <span className="text-purple-400 font-bold">🔒 Secure:</span> Your documents are encrypted and only visible to admins.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-bold hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-gray-400 hover:text-gray-300 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}