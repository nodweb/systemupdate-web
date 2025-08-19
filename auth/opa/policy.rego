package systemupdate

# Demo policy with allow-by-default, but deny a specific action to showcase 403 behavior.

default allow = true

# Deny acknowledging commands via policy (when OPA is enabled in services)
allow = false {
  input.action == "commands:ack"
}

# Example future allow rule:
# allow {
#   input.action == "commands:create"
#   startswith(input.resource, "dev-")
# }
