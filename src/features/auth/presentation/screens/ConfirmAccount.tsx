import { CustomFilledButton, CustomForm, FadeInUp, OTPFormField, StaggerContainer, StaggerItem, TextFormField, Title, useNotification } from "@/features/shared/shared";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authProvider, type ConfirmAccountForm } from "@/features/auth/auth";
import { useMutation } from "@tanstack/react-query";

const tramos = [
  { label: "Cuenta creada", detail: "Tus datos quedaron registrados", state: "done" },
  { label: "Código enviado", detail: "Revisa tu correo, vence en 10 minutos", state: "active" },
  { label: "Cuenta Confirmada", detail: "Podrás operar en LegumexApps", state: "pending" },
] as const;

export function ConfirmAccount() {
  const { success, error } = useNotification();
  const navigate = useNavigate();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfirmAccountForm>();

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: ConfirmAccountForm) => authProvider.confirmAccount(payload),
    onSuccess: (message) => {
      success(message);
      navigate('/login');
    },
    onError: (err) => {
      error(err.message);
    }
  });

  const onSubmit = (data: ConfirmAccountForm) => mutate(data);

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
              Tu cuenta va en tránsito.
            </h2>
          </StaggerItem>

          <StaggerItem>
            <p className="mt-6 max-w-[38ch] text-[15px] leading-relaxed text-canvas/60">
              Falta un tramo: confirma el código que enviamos a tu correo y la
              cuenta queda entregada.
            </p>
          </StaggerItem>

          <StaggerItem>
            <ol className="mt-12 flex flex-col">
              {tramos.map((tramo, index) => (
                <li key={tramo.label} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1.5 h-2.25 w-2.25 shrink-0 rounded-full ${tramo.state === "pending"
                          ? "bg-canvas/25"
                          : tramo.state === "active"
                            ? "route_node_active bg-primary"
                            : "bg-canvas/60"
                        }`}
                    />
                    {index < tramos.length - 1 && (
                      <span className="route_line mt-2 w-px flex-1" />
                    )}
                  </div>

                  <div className={index < tramos.length - 1 ? "pb-8" : ""}>
                    <p
                      className={`font-mono text-[11px] uppercase tracking-[0.22em] ${tramo.state === "pending" ? "text-canvas/35" : "text-canvas/80"
                        }`}
                    >
                      {tramo.label}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-canvas/50">
                      {tramo.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
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
              Tu cuenta va en tránsito.
            </h2>
          </div>

          <FadeInUp>
            <CustomForm onSubmit={handleSubmit(onSubmit)}>
              <Title
                title="Confirmar cuenta"
                subtitle="Ingresa el código de 6 dígitos que enviamos a tu correo."
              />

              <TextFormField<ConfirmAccountForm>
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

              <OTPFormField<ConfirmAccountForm>
                label="Código de confirmación"
                name="code"
                control={control}
                errorMessage={errors.code?.message}
                validation={{
                  required: "Ingresa el código",
                  minLength: {
                    value: 6,
                    message: "El código debe tener 6 dígitos",
                  },
                }}
              />

              <CustomFilledButton
                label="Confirmar cuenta"
                type="submit"
                fullWitdh
                disabled={isPending}
              />

              <p className="text-center text-sm text-ink-muted">
                ¿No llegó el código?{" "}
                <Link
                  to="/login"
                  className="font-medium text-ink underline underline-offset-4 transition-colors hover:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                  Volver a iniciar sesión
                </Link>
              </p>
            </CustomForm>
          </FadeInUp>
        </div>
      </section>
    </main>
  );
}
