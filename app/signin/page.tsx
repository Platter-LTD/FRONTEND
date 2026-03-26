import { SigninForm } from "@/components/signin-form"
import { ProductAuthShell } from "@/components/product-auth-shell"

export default function SigninPage() {
  return (
    <ProductAuthShell>
      <div className="w-full px-4">
        <SigninForm />
      </div>
    </ProductAuthShell>
  )
}