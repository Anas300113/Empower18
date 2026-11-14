#!/bin/bash
echo "== processes =="
ps aux | grep -E 'apt|dpkg' | grep -v grep || echo "no apt processes"
echo "== logs =="
ls -la /tmp/*.log 2>&1 || true
echo "== install log =="
cat /tmp/pg-install.log 2>&1 || echo "missing"
echo "== psql =="
which psql pg_ctl initdb 2>&1 || true
