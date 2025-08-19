# Example policies repository for OPAL/OPA

This folder demonstrates a minimal layout you can use in a separate Git repo
(e.g., nodweb/systemupdate-policies). Point `OPAL_POLICY_REPO_URL` to that repo
so OPAL can watch for changes and push bundles to OPA.

Suggested layout:

```
policies/
  policy.rego
  commands.rego

data/
  roles.json
  tenants.json
```

- Make sure your packages and data paths line up with what services query.
- In this project, services query `systemupdate/allow`.
