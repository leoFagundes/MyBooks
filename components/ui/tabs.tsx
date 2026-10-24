"use client";

import { motion } from "motion/react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { createContext, use, useId } from "react";
import { springs, tweens } from "@/lib/motion";
import { useControllableState } from "@/lib/use-controllable-state";
import { cn } from "@/lib/utils";

const TabsContext = createContext<{ value: string; id: string }>({
  value: "",
  id: "",
});

function Tabs({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const id = useId();

  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      value={value}
      onValueChange={setValue}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <TabsContext value={{ value, id }}>{children}</TabsContext>
    </TabsPrimitive.Root>
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "flex items-center gap-6 border-b border-border",
        className,
      )}
      {...props}
    />
  );
}

/** O indicador desliza entre as abas com layoutId (spec §3, momento 2). */
function TabsTrigger({
  value,
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const tabs = use(TabsContext);
  const active = tabs.value === value;

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative -mb-px inline-flex cursor-pointer items-center gap-2 pb-3 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
      {active && (
        <motion.span
          layoutId={`${tabs.id}-indicador`}
          transition={springs.snappy}
          className="absolute inset-x-0 -bottom-px h-px bg-foreground"
        />
      )}
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("outline-none", className)}
      {...props}
    >
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={tweens.base}
      >
        {children}
      </motion.div>
    </TabsPrimitive.Content>
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
