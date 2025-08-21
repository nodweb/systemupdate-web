import json
import logging
import logging.config
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

try:
    from pythonjsonlogger import jsonlogger
except Exception:  # pragma: no cover - optional dependency during local import checks
    jsonlogger = None  # type: ignore


if jsonlogger is not None:
    class CustomJsonFormatter(jsonlogger.JsonFormatter):
        def add_fields(
            self,
            log_record: Dict[str, Any],
            record: logging.LogRecord,
            message_dict: Dict[str, Any],
        ) -> None:
            super().add_fields(log_record, record, message_dict)
            
            if not log_record.get('timestamp'):
                log_record['timestamp'] = datetime.now(timezone.utc).isoformat()
                
            if log_record.get('level'):
                log_record['level'] = log_record['level'].upper()
            else:
                log_record['level'] = record.levelname

            if not log_record.get('service'):
                log_record['service'] = os.getenv('SERVICE_NAME', 'unknown')
                
            if not log_record.get('environment'):
                log_record['environment'] = os.getenv('ENVIRONMENT', 'development')
else:
    class CustomJsonFormatter(logging.Formatter):  # fallback to text-like JSON-ish
        def format(self, record: logging.LogRecord) -> str:
            payload = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'level': record.levelname,
                'name': record.name,
                'service': os.getenv('SERVICE_NAME', 'unknown'),
                'environment': os.getenv('ENVIRONMENT', 'development'),
                'message': record.getMessage(),
            }
            # Include extras if present
            for k, v in getattr(record, '__dict__', {}).items():
                if k not in ('args', 'asctime', 'created', 'exc_info', 'exc_text', 'filename', 'funcName',
                             'levelname', 'levelno', 'lineno', 'module', 'msecs', 'message', 'msg', 'name',
                             'pathname', 'process', 'processName', 'relativeCreated', 'stack_info', 'thread',
                             'threadName'):
                    try:
                        json.dumps(v)
                        payload[k] = v
                    except Exception:
                        payload[k] = str(v)
            return json.dumps(payload)


def setup_logging(
    log_level: str = 'INFO',
    log_file: Optional[str] = None,
    log_format: str = 'json',
    log_rotate: bool = True,
) -> None:
    """
    Setup logging configuration.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Path to log file. If None, logs to console only
        log_format: Log format ('json' or 'text')
        log_rotate: If True, enable log rotation
    """
    log_level = log_level.upper()
    log_handlers = []
    
    # Console handler
    console_handler = {
        'class': 'logging.StreamHandler',
        'level': log_level,
        'formatter': log_format,
        'stream': 'ext://sys.stdout',
    }
    log_handlers.append('console')
    
    # File handler if log_file is specified
    if log_file:
        log_dir = os.path.dirname(log_file)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
            
        if log_rotate:
            file_handler = {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': log_level,
                'formatter': log_format,
                'filename': log_file,
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5,
                'encoding': 'utf8',
            }
        else:
            file_handler = {
                'class': 'logging.FileHandler',
                'level': log_level,
                'formatter': log_format,
                'filename': log_file,
                'encoding': 'utf8',
            }
        log_handlers.append('file')
    
    # Formatters
    if jsonlogger is not None:
        formatters = {
            'json': {
                '()': CustomJsonFormatter,
                'format': '%(timestamp)s %(level)s %(name)s %(message)s',
            },
            'text': {
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S',
            },
        }
    else:
        # Fallback: still route 'json' to CustomJsonFormatter (stringifies JSON)
        formatters = {
            'json': {
                '()': CustomJsonFormatter,
            },
            'text': {
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S',
            },
        }
    
    # Logging config
    logging_config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': formatters,
        'handlers': {}
    }
    
    # Add handlers
    if 'console' in log_handlers:
        logging_config['handlers']['console'] = console_handler
    if 'file' in log_handlers and log_file:
        logging_config['handlers']['file'] = file_handler
    
    # Configure root logger
    logging_config['root'] = {
        'handlers': log_handlers,
        'level': log_level,
    }
    
    # Configure third-party loggers
    logging_config['loggers'] = {
        'uvicorn': {
            'handlers': log_handlers,
            'level': 'INFO',
            'propagate': False,
        },
        'fastapi': {
            'handlers': log_handlers,
            'level': 'INFO',
            'propagate': False,
        },
        'sqlalchemy': {
            'handlers': log_handlers,
            'level': 'WARNING',
            'propagate': False,
        },
        'aiokafka': {
            'handlers': log_handlers,
            'level': 'INFO',
            'propagate': False,
        },
    }
    
    # Apply config
    logging.config.dictConfig(logging_config)
    
    # Set asyncio logger
    logging.getLogger('asyncio').setLevel(log_level)
    
    # Disable some noisy loggers
    logging.getLogger('matplotlib').setLevel(logging.WARNING)
    logging.getLogger('PIL').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('botocore').setLevel(logging.WARNING)


def get_logger(name: str = None) -> logging.Logger:
    """
    Get a configured logger instance.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Configured logger instance
    """
    if not name:
        name = __name__.split('.')[0]
    
    logger = logging.getLogger(name)
    
    # If no handlers are configured, setup default logging
    if not logger.handlers and logging.getLogger().handlers:
        setup_logging()
    
    return logger
