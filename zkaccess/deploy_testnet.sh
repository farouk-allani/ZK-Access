#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${ALEO_PRIVATE_KEY:-}" ]]; then
  echo "ERROR: ALEO_PRIVATE_KEY is not set."
  echo "Export it first, then rerun this script."
  exit 1
fi

ENDPOINT="${ALEO_ENDPOINT:-https://api.explorer.provable.com/v1}"
NETWORK="${ALEO_NETWORK:-testnet}"
PRIORITY_FEES="${ALEO_PRIORITY_FEES:-5000000}"

echo "Deploying zkaccess_v3.aleo to ${NETWORK} via ${ENDPOINT}"
leo deploy \
  --private-key "${ALEO_PRIVATE_KEY}" \
  --network "${NETWORK}" \
  --endpoint "${ENDPOINT}" \
  --broadcast \
  --priority-fees "${PRIORITY_FEES}" \
  --yes
