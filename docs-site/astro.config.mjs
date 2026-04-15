import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://footprintjs.github.io",
  base: "/school-footprint",
  integrations: [
    starlight({
      title: "school-footprint",
      tagline: "Shopify for Schools — configurable SIS engine",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/footprintjs/school-footprint" },
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Why school-footprint?", slug: "getting-started/why" },
            { label: "Quick Start", slug: "getting-started/quick-start" },
            { label: "Key Concepts", slug: "getting-started/key-concepts" },
          ],
        },
        {
          label: "Architecture",
          items: [
            { label: "Walkthrough (Start Here)", slug: "architecture/walkthrough" },
            { label: "Overview (4 Layers)", slug: "architecture/overview" },
            { label: "Profile-Derived Context", slug: "architecture/pdc" },
            { label: "Strategies (Behavior Switching)", slug: "architecture/strategies" },
            { label: "Flow Execution", slug: "architecture/flows" },
            { label: "Observability", slug: "architecture/observability" },
          ],
        },
        {
          label: "Examples",
          link: "https://github.com/footprintjs/school-footprint/tree/main/examples",
          attrs: { target: "_blank" },
        },
      ],
    }),
  ],
});
