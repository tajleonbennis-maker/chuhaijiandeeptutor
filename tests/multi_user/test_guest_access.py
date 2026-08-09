"""Anonymous visitors receive isolated, non-admin identities."""

import asyncio

from fastapi import Response

from deeptutor.api.routers.auth import auth_status, require_auth


def test_missing_credentials_resolve_to_restricted_guest():
    payload = asyncio.run(require_auth(authorization=None, dt_token=None))
    assert payload is not None
    assert payload.role == "user"
    assert payload.user_id == "guest_public"


def test_status_issues_an_isolated_guest_cookie():
    response = Response()
    result = asyncio.run(auth_status(response=response, authorization=None, dt_token=None))
    assert result.authenticated is False
    assert result.is_admin is False
    assert result.is_guest is True
    assert result.user_id and result.user_id.startswith("guest_")
    assert "dt_token=" in response.headers["set-cookie"]
