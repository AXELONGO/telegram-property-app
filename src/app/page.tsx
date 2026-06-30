"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  Image as ImageIcon,
  Tag,
  DollarSign,
  FileText,
  LayoutList,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

declare global {
  interface Window {
    Telegram: any;
  }
}

// Exactamente los campos que existen en Google Sheets (sin extras)
interface FormData {
  title: string;
  description: string;
  image_link: string;
  link: string;
  price: string;
  custom_label_0: string;
  custom_label_1: string;
  custom_label_2: string;
  custom_label_3: string;
  custom_label_4: string;
  custom_number_0: string;
  custom_number_1: string;
  custom_number_2: string;
  custom_number_3: string;
  custom_number_4: string;
}

const INITIAL_FORM: FormData = {
  title: "",
  description: "",
  image_link: "",
  link: "",
  price: "",
  custom_label_0: "",
  custom_label_1: "",
  custom_label_2: "",
  custom_label_3: "",
  custom_label_4: "",
  custom_number_0: "",
  custom_number_1: "",
  custom_number_2: "",
  custom_number_3: "",
  custom_number_4: "",
};

const STEPS = [
  { label: "Info", icon: FileText },
  { label: "Precio", icon: DollarSign },
  { label: "Etiquetas", icon: Tag },
  { label: "Números", icon: LayoutList },
];

export default function Home() {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const formDataRef = useRef<FormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const isTelegramRef = useRef(false);
  const totalSteps = STEPS.length;

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      isTelegramRef.current = true;
    }
  }, []);

  // Sincronizar el MainButton de Telegram con el paso actual
  useEffect(() => {
    if (!isTelegramRef.current) return;
    const tg = window.Telegram.WebApp;

    const handleNext = () => {
      if (currentStep < totalSteps) setCurrentStep((s) => s + 1);
    };
    const handleSubmitTg = () => {
      submitForm();
    };

    if (currentStep === totalSteps) {
      tg.MainButton.setText("ENVIAR A GOOGLE SHEETS");
      tg.MainButton.show();
      tg.MainButton.onClick(handleSubmitTg);
    } else {
      tg.MainButton.setText(`SIGUIENTE (${currentStep}/${totalSteps})`);
      tg.MainButton.show();
      tg.MainButton.onClick(handleNext);
    }

    return () => {
      tg.MainButton.offClick(handleNext);
      tg.MainButton.offClick(handleSubmitTg);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      formDataRef.current = newData; // Mantenemos la ref siempre actualizada
      return newData;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert("Error: Cloudinary no está configurado correctamente.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("upload_preset", uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: uploadData }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error?.message || "Error al subir imagen");
      }

      const data = await res.json();
      if (data.secure_url) {
        setFormData((prev) => ({ ...prev, image_link: data.secure_url }));
      } else {
        throw new Error("No se recibió URL de la imagen");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      alert(`Error al subir imagen: ${msg}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const submitForm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitStatus("idle");

    // Timeout de seguridad: 15 segundos máximo
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formDataRef.current), // Usamos la ref para evitar state closure rancio
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const result = await res.json();

      if (res.ok && result.success) {
        setSubmitStatus("success");
        setSubmitMessage("¡Datos enviados correctamente a Google Sheets!");
        if (isTelegramRef.current) {
          window.Telegram.WebApp.showAlert("✅ Propiedad registrada correctamente.");
          setTimeout(() => window.Telegram.WebApp.close(), 1500);
        }
      } else {
        throw new Error(result.message || "Error al enviar");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setSubmitStatus("error");
      setSubmitMessage(msg);
      if (isTelegramRef.current) {
        window.Telegram.WebApp.showAlert(`❌ Error: ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 pb-28 font-sans">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 mb-4 text-white shadow-lg shadow-blue-200">
          <h1 className="text-xl font-bold tracking-tight">🏡 Registrar Propiedad</h1>
          <p className="text-blue-100 text-sm mt-1 opacity-90">
            Paso {currentStep} de {totalSteps}: {STEPS[currentStep - 1].label}
          </p>
          {/* Barra de progreso */}
          <div className="mt-3 bg-blue-500/40 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Card del formulario */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
          <div className="p-5 space-y-4">

            {/* PASO 1: Información Principal */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                  🔑 El <strong>ID</strong> de la propiedad se generará automáticamente al enviar.
                </div>
                <div>
                  <label className={labelClass}>Título</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Terreno Residencial 140 m²"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Descripción</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Descripción detallada..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Enlace (Landing Page)</label>
                  <input
                    type="url"
                    name="link"
                    value={formData.link}
                    onChange={handleChange}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* PASO 2: Precio e Imagen */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Precio</label>
                  <input
                    type="text"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="56560 USD"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`${labelClass} flex items-center gap-1`}>
                    <ImageIcon className="w-4 h-4" /> Imagen de la Propiedad
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-4 hover:bg-blue-100 transition-colors">
                      {isUploadingImage ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 text-blue-500" />
                      )}
                      <span className="text-sm text-blue-700 font-medium">
                        {isUploadingImage ? "Subiendo imagen..." : "Seleccionar imagen"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                        className="hidden"
                      />
                    </label>
                    {formData.image_link && (
                      <div className="relative">
                        <img
                          src={formData.image_link}
                          alt="Vista previa"
                          className="w-full h-40 object-cover rounded-xl border border-gray-200"
                        />
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Subida
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3: Etiquetas */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 bg-purple-50 border border-purple-100 rounded-xl p-3">
                  Las etiquetas ayudan a categorizar la propiedad en el catálogo.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(["0", "1", "2", "3"] as const).map((n, i) => {
                    const placeholders = ["Puerto Escondido", "Rosarito", "Terreno", "Venta"];
                    const hints = ["Proyecto", "Ciudad", "Tipo", "Modalidad"];
                    return (
                      <div key={n}>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Label {n} ({hints[i]})
                        </label>
                        <input
                          type="text"
                          name={`custom_label_${n}`}
                          value={formData[`custom_label_${n}` as keyof FormData]}
                          onChange={handleChange}
                          placeholder={placeholders[i]}
                          className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all"
                        />
                      </div>
                    );
                  })}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Label 4 (Condición)
                  </label>
                  <input
                    type="text"
                    name="custom_label_4"
                    value={formData.custom_label_4}
                    onChange={handleChange}
                    placeholder="Financiamiento"
                    className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* PASO 4: Valores Numéricos */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  Ingresa los valores numéricos clave de la propiedad.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "0", label: "m² (superficie)", placeholder: "140" },
                    { key: "1", label: "Precio total USD", placeholder: "56560" },
                    { key: "2", label: "Mensualidad USD", placeholder: "677.66" },
                    { key: "3", label: "Meses financ.", placeholder: "120" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {label}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        name={`custom_number_${key}`}
                        value={formData[`custom_number_${key}` as keyof FormData]}
                        onChange={handleChange}
                        onBlur={handleChange}
                        placeholder={placeholder}
                        className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Número 4 (Apartado USD)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="custom_number_4"
                    value={formData.custom_number_4}
                    onChange={handleChange}
                    onBlur={handleChange}
                    placeholder="500"
                    className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  />
                </div>

                {/* Mensaje de estado del envío */}
                {submitStatus === "success" && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {submitMessage}
                  </div>
                )}
                {submitStatus === "error" && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {submitMessage}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botones de navegación (visibles SIEMPRE, no solo fuera de Telegram) */}
          <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-100 transition-colors text-sm"
              >
                ← Atrás
              </button>
            )}
            {currentStep < totalSteps ? (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors text-sm"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={submitForm}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-xl font-semibold shadow-md shadow-emerald-200 hover:from-emerald-600 hover:to-emerald-700 transition-colors disabled:opacity-60 text-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSubmitting ? "Enviando..." : "Enviar a Google Sheets"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
