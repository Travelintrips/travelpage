export const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window.google !== "undefined" && window.google.maps?.places) {
      console.log("✅ Google Maps sudah tersedia");
      resolve();
      return;
    }

    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        console.log("✅ Google Maps script sudah terpasang sebelumnya");
        resolve();
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.id = "google-maps-script";

    script.onload = () => {
      if (window.google?.maps?.places) {
        console.log("✅ Google Maps berhasil dimuat");
        resolve();
      } else {
        console.error(
          "⚠️ Script selesai dimuat tapi Google Maps tidak tersedia",
        );
        reject(new Error("Google Maps failed to initialize"));
      }
    };

    script.onerror = (err) => {
      console.error("❌ Gagal memuat Google Maps script:", err);
      reject(new Error("Failed to load Google Maps script"));
    };

    document.body.appendChild(script);
  });
};
