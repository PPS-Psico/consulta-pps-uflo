import React from "react";

const Loader: React.FC = () => {
  // Usamos estilos inline como fallback de seguridad para garantizar que el loader
  // se vea bien incluso si Tailwind/CSS tarda en cargar.
  return (
    <div
      className="flex justify-center items-center my-10 sm:my-12"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        margin: "3rem 0",
        width: "100%",
      }}
    >
      <div
        className="border-4 border-slate-200 border-t-blue-500 rounded-full w-10 h-10 animate-spin"
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "9999px",
          borderWidth: "4px",
          borderStyle: "solid",
          borderColor: "#e2e8f0", // slate-200
          borderTopColor: "#3b82f6", // blue-500
        }}
      ></div>
      <span
        className="sr-only"
        style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden" }}
      >
        Cargando...
      </span>
    </div>
  );
};

export default Loader;
