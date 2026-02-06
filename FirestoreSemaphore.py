from google.cloud import firestore
import time
import uuid
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FirestoreSemaphore:
    def __init__(self, lock_id: str, timeout_seconds: int = 600):
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        if not project_id:
            import subprocess
            project_id = subprocess.check_output(
                "gcloud config get-value project",
                shell=True
            ).decode().strip()

        self.db = firestore.Client(project=project_id)
        self.lock_doc_ref = self.db.collection("distributed_locks").document(lock_id)
        self.owner_id = str(uuid.uuid4())
        self.timeout = timeout_seconds

    def lock(self):
        logger.info(f"🔥 Attempting Firestore semaphore lock: {self.lock_doc_ref.id}")

        @firestore.transactional
        def attempt_acquire(transaction):
            snapshot = self.lock_doc_ref.get(transaction=transaction)
            current_time = time.time()

            if snapshot.exists:
                data = snapshot.to_dict()
                if (current_time - data.get("timestamp", 0)) <= self.timeout:
                    return False  # lock still valid

            transaction.set(self.lock_doc_ref, {
                "owner_id": self.owner_id,
                "timestamp": current_time,
            })
            return True

        while True:
            try:
                transaction = self.db.transaction()
                if attempt_acquire(transaction):
                    logger.info("✅ Firestore semaphore-lock Acquired!")
                    return True
                else:
                    logger.info("⏳ Firestore semaphore-lock busy, retrying in 5s...")
            except Exception as e:
                logger.error(f"❌ Firestore semaphore-lock Error: {repr(e)}")

            time.sleep(5)

    def unlock(self):
        try:
            snap = self.lock_doc_ref.get()
            if snap.exists and snap.to_dict().get("owner_id") == self.owner_id:
                self.lock_doc_ref.delete()
                logger.info("🔓 Firestore semaphore-lock Released.")
        except Exception as e:
            logger.error(f"Firestore semaphore-unlock error: {e}")