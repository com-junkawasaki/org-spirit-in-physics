from setuptools import setup, find_packages

setup(
    name="spirit-import-service",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.115.0",
        "uvicorn[standard]==0.32.0",
        "asyncpg==0.30.0",
        "pydantic==2.9.2",
        "temporalio==1.7.0",
        "python-dotenv==1.0.1",
    ],
)




