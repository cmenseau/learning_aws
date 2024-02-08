FROM public.ecr.aws/lambda/python:3.12

# Prevents Python from writing pyc files.
ENV PYTHONDONTWRITEBYTECODE=1

# Keeps Python from buffering stdout and stderr to avoid situations where
# the application crashes without emitting any logs due to buffering.
ENV PYTHONUNBUFFERED=1

# Copy requirements.txt
COPY requirements.txt ${LAMBDA_TASK_ROOT}
COPY lambda_function.py ${LAMBDA_TASK_ROOT}
COPY .env ${LAMBDA_TASK_ROOT}

# Install the specified packages
RUN pip install -r requirements.txt

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "lambda_function.handler" ]