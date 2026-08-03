import { Dialog, Transition } from "@headlessui/react";
import { Fragment, type ReactNode } from "react";
import { XIcon } from "lucide-react";

type Props = {
  drawer: boolean;
  closeDrawer: () => void;
  title: string;
  children: ReactNode;
  headerActions?: ReactNode;
  width?: string;
};

export function Drawer({
  drawer,
  closeDrawer,
  title,
  children,
  headerActions,
  width = "sm:max-w-md",
}: Props) {
  return (
    <Transition appear show={drawer} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={closeDrawer}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="fixed inset-y-0 right-0 flex max-w-full">

            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-x-full"
              enterTo="opacity-100 translate-x-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-x-0"
              leaveTo="opacity-0 translate-x-full"
            >
              <Dialog.Panel
                className={`w-full ${width} transform overflow-hidden bg-white shadow-2xl transition-all flex flex-col`}
              >
                <div className="flex items-center justify-between shadow-md px-6 py-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-800">
                    {title}
                  </Dialog.Title>

                  <div className="flex items-center gap-3">
                    {headerActions}

                    <button
                      onClick={closeDrawer}
                      className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
                    >
                      <XIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>

          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
