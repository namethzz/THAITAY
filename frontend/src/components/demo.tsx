import { HeroSection } from "@/components/ui/hero-3";
import { Header } from "@/components/ui/header-3";
import { materialCatalog, materialCategories } from "@/data.js";

export default function DemoOne() {
  return (
    <div className="flex w-full flex-col">
      <Header />
      <main className="grow p-6">
        <HeroSection materialCount={materialCatalog.length} categoryCount={materialCategories.length} />
      </main>
    </div>
  );
}
