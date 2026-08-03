import { Dialog, Transition } from "@headlessui/react";
import { Fragment, type ReactNode } from "react";

type Props = {
  modal: boolean;
  closeModal: () => void;
  title: string;
  children: ReactNode;
  width?: string;
};

export function Modal({
  modal,
  closeModal,
  title,
  children,
  width = "sm:max-w-2xl",
}: Props) {
  return (
    <Transition appear show={modal} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={closeModal}
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

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">

            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95 translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-2"
            >
              <Dialog.Panel
                className={`w-full ${width} transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all`}
              >
                <div className="flex items-center justify-between shadow-md px-6 py-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-800">
                    {title}
                  </Dialog.Title>

                  <button
                    onClick={closeModal}
                    className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
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
