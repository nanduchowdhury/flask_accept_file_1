import threading
import queue
from enum import Enum
import time


class TaskStatus(Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETE = "COMPLETE"
    FAILED = "FAILED"
    ABORTED = "ABORTED"
    NOT_FOUND = "NOT_FOUND"


class TaskBase:
    def __init__(self):
        self._abort = False
        _class_lock = threading.Lock()
    
    ##########################################
    # 
    # This is the lock for locking derived 
    # class data across all tasks.
    #
    ##########################################
    def lock(self):
        """Acquire the class-level lock to protect shared data."""
        self.__class__._class_lock.acquire()

    def release_lock(self):
        """Release the class-level lock."""
        self.__class__._class_lock.release()

    def run(self):
        """Derived classes should override this method with task logic."""
        raise NotImplementedError("Subclasses must implement this method")

    def shouldAbort(self):
        return self._abort

    def abort(self):
        self._abort = True

    def signal_completion(self, thread_pool, task_id):
        """Notify the thread pool that the task has completed."""
        thread_pool._task_completed(task_id)


class ThreadPool:
    def __init__(self, max_threads):
        self.max_threads = max_threads
        self.tasks = {}  # Maps task_id to {'thread': thread, 'status': status, 'task': task_obj, 'exception': exception}
        self.lock = threading.Lock()
        self.condition = threading.Condition()
        self.active_threads = 0
        self.waiting_queue = queue.Queue()

    def startTask(self, client_id, task_name, task_obj):
        """Start a task in a thread or add it to the waiting list if max threads are reached."""
        task_id = f"{client_id}_{task_name}"
        with self.lock:
            # Abort any existing task with the same ID
            if task_id in self.tasks:
                self.abortTask(task_id)

            # Define task entry
            self.tasks[task_id] = {'task': task_obj, 'status': TaskStatus.PENDING, 'exception': None}

            if self.active_threads < self.max_threads:
                # Start the task immediately
                self._run_task_in_thread(task_id, task_obj)
            else:
                # Enqueue the task to start later
                self.waiting_queue.put((task_id, task_obj))
                print(f"Task {task_id} added to waiting list")

    def _run_task_in_thread(self, task_id, task_obj):
        """Run the specified task in a new thread and track its status."""
        thread = threading.Thread(target=self._run_task, args=(task_id, task_obj))
        self.tasks[task_id]['thread'] = thread
        self.tasks[task_id]['status'] = TaskStatus.RUNNING
        self.active_threads += 1
        thread.start()

    def _run_task(self, task_id, task_obj):
        """Run the task and update its status based on the outcome."""
        try:
            task_obj.run()
            with self.lock:
                if self.tasks[task_id]['status'] != TaskStatus.ABORTED:
                    self.tasks[task_id]['status'] = TaskStatus.COMPLETE
        except Exception as e:
            with self.lock:
                self.tasks[task_id]['status'] = TaskStatus.FAILED
                self.tasks[task_id]['exception'] = e
            print(f"Task {task_id} failed with exception: {e}")
        finally:
            task_obj.signal_completion(self, task_id)

    def _task_completed(self, task_id):
        """Handle task completion, freeing up a slot and potentially running a waiting task."""
        with self.condition:  # Acquire the lock on the condition
            self.active_threads -= 1
            # Notify waiting threads in case they are waiting for tasks to complete
            self.condition.notify_all()

            # Check for tasks in the waiting queue
            if not self.waiting_queue.empty():
                next_task_id, next_task_obj = self.waiting_queue.get()
                self._run_task_in_thread(next_task_id, next_task_obj)

    def waitForTask(self, client_id, task_name):
        """Block until the specified task completes."""
        task_id = f"{client_id}_{task_name}"
        with self.condition:
            while task_id in self.tasks and self.tasks[task_id]['status'] in {TaskStatus.PENDING, TaskStatus.RUNNING}:
                self.condition.wait()

    def waitForAll(self):
        """Block until all tasks complete."""
        with self.condition:
            while any(task['status'] in {TaskStatus.PENDING, TaskStatus.RUNNING} for task in self.tasks.values()):
                self.condition.wait()

    def isAllCompleted(self):
        """Return True if all tasks have completed."""
        with self.lock:
            return all(task['status'] in {TaskStatus.COMPLETE, TaskStatus.ABORTED, TaskStatus.FAILED} for task in self.tasks.values())

    def taskStatus(self, client_id, task_name):
        """Return the status of the task, including any exception if the task failed."""
        task_id = f"{client_id}_{task_name}"
        with self.lock:
            if task_id in self.tasks:
                status = self.tasks[task_id]['status']
                exception = self.tasks[task_id].get('exception')
                if status == TaskStatus.FAILED and exception:
                    return f"{status} with exception: {exception}"
                return status
            return TaskStatus.NOT_FOUND

    def abortTask(self, task_id):
        """Abort the specified task."""
        if task_id in self.tasks:
            task_info = self.tasks[task_id]
            task_info['task'].abort()
            task_info['status'] = TaskStatus.ABORTED
            if task_info['thread'].is_alive():
                print(f"Task {task_id} aborted.")
