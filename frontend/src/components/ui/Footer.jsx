export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-border py-6 text-sm text-muted-foreground">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        &copy; {year} Organex
      </div>
    </footer>
  )
}
