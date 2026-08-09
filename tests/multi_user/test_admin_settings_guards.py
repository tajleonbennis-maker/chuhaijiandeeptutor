"""Deployment settings must never be exposed to ordinary accounts."""

from fastapi.routing import APIRoute

from deeptutor.api.routers import capabilities_settings, memory, subagents
from deeptutor.api.routers.auth import require_admin
from deeptutor.multi_user.router import router as multi_user_router


def _route(router, path: str, method: str) -> APIRoute:
    return next(
        route
        for route in router.routes
        if isinstance(route, APIRoute) and route.path == path and method in route.methods
    )


def _requires_admin(route: APIRoute) -> bool:
    return any(dependency.call is require_admin for dependency in route.dependant.dependencies)


def test_deployment_settings_reads_and_writes_require_admin():
    protected = (
        (capabilities_settings.router, "/settings", "GET"),
        (capabilities_settings.router, "/settings", "PUT"),
        (memory.router, "/settings", "GET"),
        (memory.router, "/settings", "PUT"),
        (subagents.router, "/settings", "GET"),
        (subagents.router, "/settings", "PUT"),
    )

    for router, path, method in protected:
        assert _requires_admin(_route(router, path, method)), f"{method} {path} is not admin-gated"


def test_user_data_overview_requires_admin():
    route = _route(multi_user_router, "/users/{user_id}/data", "GET")
    assert _requires_admin(route)
