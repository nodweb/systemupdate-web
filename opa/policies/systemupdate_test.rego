package systemupdate

import future.keywords.in

test_allow_health_endpoint {
    allow with input as {
        "method": "GET",
        "path": ["health"],
        "user": {
            "id": "test-user",
            "roles": ["user"]
        }
    }
}

test_deny_admin_endpoint_for_non_admin {
    not allow with input as {
        "method": "GET",
        "path": ["admin"],
        "user": {
            "id": "test-user",
            "roles": ["user"]
        }
    }
}

test_allow_admin_endpoint_for_admin {
    allow with input as {
        "method": "GET",
        "path": ["admin"],
        "user": {
            "id": "admin-user",
            "roles": ["admin"]
        }
    }
}

test_allow_own_profile {
    allow with input as {
        "method": "GET",
        "path": ["users", "test-user"],
        "user": {
            "id": "test-user",
            "roles": ["user"]
        }
    }
}

test_deny_other_users_profile {
    not allow with input as {
        "method": "GET",
        "path": ["users", "other-user"],
        "user": {
            "id": "test-user",
            "roles": ["user"]
        }
    }
}
