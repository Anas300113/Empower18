#!/bin/bash
# Disposable PostgreSQL installer for QA testing only. Never touches production.
set -e
{
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-client
  echo "INSTALL_DONE"
} > /tmp/pg-install.log 2>&1
echo "INSTALL_DONE" >> /tmp/pg-install.log
