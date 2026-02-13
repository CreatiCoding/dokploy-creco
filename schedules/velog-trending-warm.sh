#!/bin/bash
curl -sf https://api.dokploy.creco.dev/velog-trending/week > /dev/null && echo OK || echo FAIL
