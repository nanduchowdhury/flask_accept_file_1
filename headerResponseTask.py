
from ThreadPool import ThreadPool, TaskStatus, TaskBase


class HeaderResponseTask(TaskBase):
    def __init__(self, uuid, sess, gemini_access, learnLevel):
        super().__init__()
        self.uuid = uuid
        self.sess = sess
        self.gemini_access = gemini_access
        self.learnLevel = learnLevel

        self.base_tag = f'upload_file.header_response.{self.learnLevel}'
        self.tag_english = f'{self.base_tag}.english'
        self.tag_hindi = f'{self.base_tag}.hindi'
        self.tag_job_status = f'{self.base_tag}.job_status'
        self.tag_job_error = f'{self.base_tag}.job_error'

    def is_task_started(self):
        if self.sess.is_client_data_present(self.uuid, self.tag_job_status):
            if self.sess.get_client_data(self.uuid, self.tag_job_status) == 'STARTED':
                return True
        return False

    def is_task_completed(self):
        if self.sess.is_client_data_present(self.uuid, self.tag_job_status):
            if self.sess.get_client_data(self.uuid, self.tag_job_status) == 'COMPLETED':
                return True
        return False

    def get_results(self):
        english_response = ''
        hindi_response = ''

        if self.sess.is_client_data_present(self.uuid, self.tag_english) and self.sess.is_client_data_present(self.uuid, self.tag_hindi):
            english_response = self.sess.get_client_data(self.uuid, self.tag_english)
            hindi_response = self.sess.get_client_data(self.uuid, self.tag_hindi)

        return english_response, hindi_response

    # This is the actual task - this can be called without thread.
    def perform_actual_task(self):
        num_learn_points = self.sess.get_client_data(self.uuid, 'upload_file.num_learn_points')

        english_response = ''
        hindi_response = ''

        if self.learnLevel < num_learn_points:
            first_response = self.sess.get_client_data(self.uuid, 'upload_file.first_response')
            english_response = self.gemini_access.get_header_summary(self.uuid, first_response[self.learnLevel])
            hindi_response = self.gemini_access.convert_to_hindi(english_response)

        return english_response, hindi_response

    def save_results(self, english_response, hindi_response, job_status, job_error):
        self.sess.save_client_data(self.uuid, self.tag_english, english_response)
        self.sess.save_client_data(self.uuid, self.tag_hindi, hindi_response)
        self.sess.save_client_data(self.uuid, self.tag_job_status, job_status)
        self.sess.save_client_data(self.uuid, self.tag_job_error, job_error)

    def run(self):
        english_response = ''
        hindi_response = ''
        job_status = 'STARTED'
        job_error = 'NONE'

        self.save_results(english_response, hindi_response, job_status, job_error)
        try:
            english_response, hindi_response = self.perform_actual_task()
        except Exception as e:
            job_error = 'ERROR'

        job_status = 'COMPLETED'
        self.save_results(english_response, hindi_response, job_status, job_error)

            
