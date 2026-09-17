import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

/**
 * Login/registro propio (usuario y contraseña) contra nuestra base de datos.
 * Reemplaza el botón que redirigía al OAuth de Manus.
 */
export function LoginForm() {
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async user => {
      // Actualiza la pantalla de inmediato...
      utils.auth.me.setData(undefined, user);
      // ...y confirma con el servidor que la cookie de sesión quedó guardada.
      await utils.auth.me.invalidate();
    },
  });
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async user => {
      utils.auth.me.setData(undefined, user);
      await utils.auth.me.invalidate();
    },
  });

  const activeMutation = mode === "login" ? loginMutation : registerMutation;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ name, email, password });
    }
  };

  const switchMode = () => {
    loginMutation.reset();
    registerMutation.reset();
    setMode(mode === "login" ? "register" : "login");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      {mode === "register" && (
        <div className="flex flex-col gap-1.5 text-left">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Tu nombre"
            required
            autoComplete="name"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5 text-left">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-1.5 text-left">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>

      {activeMutation.error && (
        <p className="text-sm text-destructive text-left">
          {activeMutation.error.message}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full shadow-lg hover:shadow-xl transition-all"
        disabled={activeMutation.isPending}
      >
        {activeMutation.isPending
          ? "Un momento..."
          : mode === "login"
            ? "Iniciar sesión"
            : "Crear cuenta"}
      </Button>

      <button
        type="button"
        onClick={switchMode}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {mode === "login" ? "¿No tienes cuenta? Crea una" : "¿Ya tienes cuenta? Inicia sesión"}
      </button>
    </form>
  );
}
