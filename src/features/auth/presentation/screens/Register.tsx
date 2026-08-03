import { authProvider } from "@/features/auth/auth";
import { CustomFilledButton, CustomForm, FadeInUp, PasswordFormField, SelectFormField, StaggerContainer, StaggerItem, TextFormField, Title, useNotification } from "@/features/shared/shared";
import { Link } from "react-router-dom";
import { RoleOptions } from "@/features/auth/auth";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import type { RegisterForm } from "@/features/auth/auth";

export function Register() {
  const { information, error } = useNotification();

  const {
    register,
    handleSubmit,
    control,
    getValues,
    reset,
    formState: { errors },
  } = useForm<RegisterForm>();

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: RegisterForm) => authProvider.register(payload),
    onSuccess: (message) => {
      information(message);
      reset();
    },
    onError: (err) => {
      error(err.message);
    }
  });

  const onSubmit = (data: RegisterForm) => mutate(data);

  return (
    <main className="min-h-screen w-full bg-canvas lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink-deep px-12 py-14 text-canvas lg:flex xl:px-16">
        <StaggerContainer>
          <StaggerItem>
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-canvas/50">
              Legumex · Transportes
            </p>
          </StaggerItem>

          <StaggerItem>
            <h2 className="mt-10 max-w-[13ch] font-display text-[2.75rem] font-semibold leading-[1.04] tracking-tight text-canvas xl:text-[3.25rem]">
              Suma tu nombre a la ruta.
            </h2>
          </StaggerItem>

          <StaggerItem>
            <p className="mt-6 max-w-[38ch] text-[15px] leading-relaxed text-canvas/60">
              Cada cuenta queda ligada a un tramo del recorrido. Así se sabe
              quién movió la carga y en qué momento la entregó.
            </p>
          </StaggerItem>
        </StaggerContainer>

        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-canvas/35">
          Control Interno
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-14 sm:px-10 lg:min-h-full">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-ink-subtle">
              Legumex · Transportes
            </p>
            <h2 className="mt-3 font-display text-[1.75rem] leading-tight font-semibold tracking-tight text-ink">
              Suma tu nombre a la ruta.
            </h2>
          </div>

          <FadeInUp>
            <CustomForm onSubmit={handleSubmit(onSubmit)}>
              <Title
                title="Crear cuenta"
                subtitle="Registra tus datos para operar en LegumexApps."
              />

              <TextFormField<RegisterForm>
                label="Nombre"
                name="name"
                type="text"
                placeholder="Nombre y apellido"
                register={register}
                errorMessage={errors.name?.message}
                validation={{
                  required: "Ingresa tu nombre",
                  minLength: {
                    value: 3,
                    message: "El nombre debe tener al menos 3 caracteres",
                  },
                }}
              />

              <TextFormField<RegisterForm>
                label="Correo"
                name="email"
                type="email"
                placeholder="nombre@legumex.com"
                register={register}
                errorMessage={errors.email?.message}
                validation={{
                  required: "Ingresa tu correo",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Ingresa un correo válido",
                  },
                }}
              />

              <SelectFormField<RegisterForm>
                label="Rol"
                name="role"
                options={RoleOptions}
                control={control}
                errorMessage={errors.role?.message}
                validation={{
                  required: "Selecciona tu rol",
                }}
              />

              <PasswordFormField<RegisterForm>
                label="Contraseña"
                name="password"
                placeholder="Tu contraseña"
                register={register}
                errorMessage={errors.password?.message}
                validation={{
                  required: "Ingresa tu contraseña",
                  minLength: {
                    value: 6,
                    message: "La contraseña debe tener al menos 6 caracteres",
                  },
                }}
              />

              <PasswordFormField<RegisterForm>
                label="Confirmar contraseña"
                name="password_confirmation"
                placeholder="Repite tu contraseña"
                register={register}
                errorMessage={errors.password_confirmation?.message}
                validation={{
                  required: "Confirma tu contraseña",
                  validate: (value) =>
                    value === getValues("password") ||
                    "Las contraseñas no coinciden",
                }}
              />

              <CustomFilledButton
                label="Crear cuenta"
                type="submit"
                fullWitdh
                disabled={isPending}
              />

              <p className="text-center text-sm text-ink-muted">
                ¿Ya tienes cuenta?{" "}
                <Link
                  to="/login"
                  className="font-medium text-ink underline underline-offset-4 transition-colors hover:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                  Iniciar sesión
                </Link>
              </p>
            </CustomForm>
          </FadeInUp>
        </div>
      </section>
    </main>
  );
}
