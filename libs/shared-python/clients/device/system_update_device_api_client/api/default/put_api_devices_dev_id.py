from http import HTTPStatus
from typing import Any, Optional, Union

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.device import Device
from ...models.device_update import DeviceUpdate
from ...types import Response


def _get_kwargs(
    dev_id: str,
    *,
    body: DeviceUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "put",
        "url": f"/api/devices/{dev_id}",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: Union[AuthenticatedClient, Client], response: httpx.Response
) -> Optional[Device]:
    if response.status_code == 200:
        response_200 = Device.from_dict(response.json())

        return response_200
    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: Union[AuthenticatedClient, Client], response: httpx.Response
) -> Response[Device]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    dev_id: str,
    *,
    client: Union[AuthenticatedClient, Client],
    body: DeviceUpdate,
) -> Response[Device]:
    """Update device

    Args:
        dev_id (str):
        body (DeviceUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Device]
    """

    kwargs = _get_kwargs(
        dev_id=dev_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    dev_id: str,
    *,
    client: Union[AuthenticatedClient, Client],
    body: DeviceUpdate,
) -> Optional[Device]:
    """Update device

    Args:
        dev_id (str):
        body (DeviceUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Device
    """

    return sync_detailed(
        dev_id=dev_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    dev_id: str,
    *,
    client: Union[AuthenticatedClient, Client],
    body: DeviceUpdate,
) -> Response[Device]:
    """Update device

    Args:
        dev_id (str):
        body (DeviceUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Device]
    """

    kwargs = _get_kwargs(
        dev_id=dev_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    dev_id: str,
    *,
    client: Union[AuthenticatedClient, Client],
    body: DeviceUpdate,
) -> Optional[Device]:
    """Update device

    Args:
        dev_id (str):
        body (DeviceUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Device
    """

    return (
        await asyncio_detailed(
            dev_id=dev_id,
            client=client,
            body=body,
        )
    ).parsed
