import { CustomFilledButton, CustomForm, FadeInUp, PasswordFormField, StaggerContainer, StaggerItem, TextFormField, Title } from "@/features/shared/shared";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import type { LoginForm } from "@/features/auth/auth";

export function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = (data: LoginForm) => {
    console.log(data);
  };

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
              Cada camión, con su ruta anotada.
            </h2>
          </StaggerItem>

          <StaggerItem>
            <p className="mt-6 max-w-[38ch] text-[15px] leading-relaxed text-canvas/60">
              Cargas y rutas detnro de un solo registro, desde su destino hasta su punto de entrega.
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
              Cada Camión, con su ruta anotada.
            </h2>
          </div>

          <FadeInUp>
            <CustomForm onSubmit={handleSubmit(onSubmit)}>
              <Title
                title="Iniciar sesión"
                subtitle="Ingresa con tu cuenta de LegumexApps."
              />

              <TextFormField<LoginForm>
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

              <PasswordFormField<LoginForm>
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

              <CustomFilledButton
                label="Iniciar sesión"
                type="submit"
                fullWitdh
                disabled={isSubmitting}
              />

              <p className="text-center text-sm text-ink-muted">
                ¿No tienes cuenta?{" "}
                <Link
                  to="/register"
                  className="font-medium text-ink underline underline-offset-4 transition-colors hover:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                  Crear cuenta
                </Link>
              </p>
            </CustomForm>
          </FadeInUp>
        </div>
      </section>
    </main>
  );
}
