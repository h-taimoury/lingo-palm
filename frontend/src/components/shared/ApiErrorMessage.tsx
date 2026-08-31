import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ApiError } from "@/lib/api/errors"

export function ApiErrorMessage({ error }: { error: unknown }) {
  if (!error) return null
  const message = error instanceof Error ? error.message : "Something went wrong."
  const fields = error instanceof ApiError ? error.fieldErrors : {}
  return (
    <Alert variant="destructive">
      <AlertTitle>Couldn’t complete that action</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {Object.keys(fields).length ? <ul className="mt-2 list-disc space-y-1 pl-5">{Object.entries(fields).flatMap(([field, messages]) => messages.map((item) => <li key={`${field}-${item}`}><span className="font-medium">{field.replaceAll("_", " ")}:</span> {item}</li>))}</ul> : null}
      </AlertDescription>
    </Alert>
  )
}
