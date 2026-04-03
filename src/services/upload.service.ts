export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const token = localStorage.getItem("token");

  const res = await fetch("http://localhost:8000/uploads", {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`, // ✅ REQUIRED
    },
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Upload failed");
  }

  return res.json();
};