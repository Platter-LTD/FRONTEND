import { Suspense } from "react"
import { SigninForm } from "@/components/signin-form"
import { ProductAuthShell } from "@/components/product-auth-shell"

export default function SigninPage() {
  return (
    <ProductAuthShell>
      <div className="w-full px-4">
        <Suspense
          fallback={
            <div className="flex justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#9A813F]" />
            </div>
          }
        >
          <SigninForm />
        </Suspense>
      </div>
    </ProductAuthShell>
  )
}