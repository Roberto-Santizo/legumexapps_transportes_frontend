import { CustomForm, FadeInUp, StaggerContainer, StaggerItem, Title } from "@/features/shared/shared";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/config";

export function CompleteProfile() {
  const isSignedIn = useSelector((state: RootState) => state.auth.isSignedIn);
  const user = useSelector((state: RootState) => state.auth.user);

  if (!isSignedIn) return <Navigate to={'/login'} replace />

  if (user?.role !== "carrier" || user.carrierId !== null) {
    return <Navigate to={'/dashboard'} replace />
  }

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
              Antes de operar, registra tu transportista.
            </h2>
          </StaggerItem>

          <StaggerItem>
            <p className="mt-6 max-w-[38ch] text-[15px] leading-relaxed text-canvas/60">
              Los viajes, los pilotos y las unidades cuelgan del transportista.
              Sin él no hay a qué asignar la carga.
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
              Antes de operar, registra tu transportista.
            </h2>
          </div>

          <FadeInUp>
            <CustomForm onSubmit={(e) => e.preventDefault()}>
              <Title
                title="Completa tu perfil"
                subtitle="Registra tu transportista para empezar a operar en LegumexApps."
              />
            </CustomForm>
          </FadeInUp>
        </div>
      </section>
    </main>
  );
}
