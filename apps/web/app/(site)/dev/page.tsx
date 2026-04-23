import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

const DevPlayground = dynamic(() => import("./dev-playground"), { ssr: false });

export default function DevPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }
  return <DevPlayground />;
}
