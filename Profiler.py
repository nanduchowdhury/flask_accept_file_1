from line_profiler import LineProfiler

#####################################################
# Following is how to use it:
#
#      # create object
#      self.profile_class = ProfileClass()
#      # add function that will be called and need to be profiled
#      self.profile_class.add_method(self.gemini_access.upload_file)
#
#      # Next go to the place where the addede function is called
#      self.profile_class.enable()
#      self.gemini_access.upload_file(uuid, main_content_file)
#      self.profile_class.disable()
#      self.profile_class.print_stats("gemini_access_output.txt")
#
####################################################

class ProfileClass:
    def __init__(self):
        self.profiler = LineProfiler()

    def add_method(self, method):
        """Adds a method to the profiler."""
        self.profiler.add_function(method)

    def enable(self):
        """Enables the profiler."""
        self.profiler.enable()

    def disable(self):
        """Disables the profiler."""
        self.profiler.disable()

    def print_stats(self, filename):
        """Prints the profiling statistics to a file."""
        with open(filename, 'w') as f:
            self.profiler.print_stats(stream=f)
