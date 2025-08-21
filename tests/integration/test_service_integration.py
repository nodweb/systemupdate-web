import pytest

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skip(reason="integration test stub; requires running stack"),
]  # noqa: E501


class TestServiceIntegration:
    async def test_command_to_device_flow(self):
        """Stub: verifies command-service to device-service flow when stack is up."""
        assert True
