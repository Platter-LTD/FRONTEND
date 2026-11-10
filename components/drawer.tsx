"use client"

import * as React from "react"
import { DrawerPanel } from "@/components/ui/drawer-panel"

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  children: React.ReactNode
  /** Classes for the panel (e.g. a wider max width). */
  className?: string
  /** Sticky action row at the bottom. */
  footer?: React.ReactNode
  /** Sticky row under the header band (e.g. step tabs). */
  subHeader?: React.ReactNode
  /** Classes for the scrolling body. */
  bodyClassName?: string
}

/**
 * The app's standard right-hand drawer: a floating rounded panel with a
 * colored header band (title + subtitle + close), a scrolling body and an
 * optional sticky footer. See `DrawerPanel` for the shell.
 */
export const Drawer = ({ open, onOpenChange, title, subtitle, children, className, footer, subHeader, bodyClassName }: DrawerProps) => (
  <DrawerPanel
    open={open}
    onOpenChange={onOpenChange}
    title={title}
    description={subtitle}
    className={className}
    footer={footer}
    subHeader={subHeader}
    bodyClassName={bodyClassName}
  >
    {children}
  </DrawerPanel>
)
