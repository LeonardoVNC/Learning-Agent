import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Table, Checkbox, Button, message } from "antd";
import { CalendarOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import type { AttendanceRow, CreateAttendanceInterface } from "../interfaces/attendanceInterface";
import type { StudentInfo } from "../interfaces/studentInterface";
import useAttendance from "../hooks/useAttendance";

interface AttendanceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  students: StudentInfo[];
  classId: string;
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({
  open,
  onClose,
  students = [],
  onSubmit,
  classId,
}) => {
  const [studentMap, setStudentMap] = useState<Map<string, boolean>>(new Map())
  const [attendanceData, setAttendanceData] = useState<AttendanceRow[]>([]);
  const [absentData, setAbsentData] = useState<AttendanceRow[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const { saveAttendanceList } = useAttendance();

  const prepareData = useCallback(() => {
    const dataMap: Map<string, boolean> = new Map();
    students.map((student: StudentInfo) => {
      dataMap.set(student.userId, false)
    })

    setStudentMap(dataMap)
  }, [students])

  useEffect(() => {
    prepareData();
  }, [students])

  const resetStudentMap = () => {
    const newMap = new Map<string, boolean>();
    students.forEach(student => {
      newMap.set(student.userId, false);
    });
    setStudentMap(newMap);
  };

  const studentInfoMap = useMemo(() => {
    const map = new Map<string, StudentInfo>();
    students.forEach(student => {
      map.set(student.userId, student);
    });
    return map;
  }, [students]);

  const columns: ColumnsType<StudentInfo> = [
    {
      title: "Código",
      dataIndex: "code",
      key: "code",
      width: 100,
      ellipsis: true,
    },
    {
      title: "Nombres",
      dataIndex: "name",
      key: "name",
      width: 160,
      ellipsis: true,
    },
    {
      title: "Apellidos",
      dataIndex: "lastname",
      key: "lastname",
      width: 180,
      ellipsis: true,
    },
    {
      title: "Asistencia",
      key: "attendance",
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={studentMap.get(record.userId) || false}
          onChange={(e) => {
            const newMap = new Map(studentMap);
            newMap.set(record.userId, e.target.checked);
            setStudentMap(newMap);
          }}
        />
      ),
    },
  ];

  const handleSubmit = () => {
    const attendanceRows = Array.from(studentMap.entries()).map(
      ([studentId, isPresent]) => ({
        studentId,
        isPresent,
      }));

    setAttendanceData(attendanceRows);

    const absences = attendanceRows.filter((a) => !a.isPresent)
    setAbsentData(absences)

    setShowConfirmModal(true)
  }

  const handleCancel = () => {
    resetStudentMap()
    onClose();
  }

  const handleConfirmation = async () => {
    setShowConfirmModal(false)

    const attendanceInfo: Omit<CreateAttendanceInterface, "teacherId"> = {
      classId,
      date: dayjs().startOf('day').toDate(),
      studentRows: attendanceData
    }

    const res = await saveAttendanceList(attendanceInfo)
    if (res?.state === "success") {
      message.success(res.message)
    } else if (res?.state === "error"){
      message.error(res.message)
    } else if (res?.state === "info") {
      message.info(res.message)
    }
    resetStudentMap();
    onSubmit();
    onClose();
  }

  const handleConfirmationCancel = () => {
    setShowConfirmModal(false)
  }

  const tableScrollY = Math.max(260, Math.floor(window.innerHeight * 0.45));

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '16px', marginBottom: '16px' }}>
          <CalendarOutlined
            style={{ marginRight: '8px', fontSize: '20px' }}
          />
          {`Tomar asistencia - ${dayjs().format("DD/MM/YYYY")}`}
        </div>
      }
      open={open}
      onCancel={handleCancel}
      maskClosable={false}
      centered
      footer={[
        <Button key="cancel" danger type="primary" onClick={handleCancel}>
          Cancelar
        </Button>,
        <Button type="primary" onClick={handleSubmit}>
          Guardar
        </Button>
      ]}
      width={window.innerWidth < 600 ? '90%' : '70%'}
      style={{ maxWidth: '90vw' }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 220px)',
          overflowY: 'auto',
        },
      }}
    >
      <Table
        columns={columns}
        dataSource={students}
        rowKey={(record) => record.code}
        pagination={false}
        scroll={{ x: 'max-content', y: tableScrollY }}
      />

      {/* Modal de confirmación - Inspirado en el Componente safetyModal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleOutlined
              style={{ marginRight: '8px', fontSize: '20px', color: '#52c41a' }}
            />
            Confirmar asistencia
          </div>
        }
        open={showConfirmModal}
        onCancel={handleConfirmationCancel}
        footer={[
          <Button key="cancel" danger onClick={handleConfirmationCancel}>
            Cancelar
          </Button>,
          <Button type="primary" onClick={handleConfirmation}>
            Guardar asistencia
          </Button>
        ]}
        width={'35%'}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <CalendarOutlined style={{ fontSize: '48px' }} />
          </div>

          <p style={{
            marginBottom: '16px',
            fontSize: '16px',
            lineHeight: '1.5'
          }}>
            Confirme la información antes de guardarla:
          </p>

          <div style={{
            backgroundColor: '#fff2e8',
            border: '1px solid #ffcc7a',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '16px',
            textAlign: 'left'
          }}>
            {absentData && absentData?.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ color: '#d46b08' }}>
                  Los siguientes estudiantes se encuentran Ausentes:
                  {absentData.map((a) => (
                    <div key={a.studentId}>
                      - {studentInfoMap.get(a.studentId)?.name} {studentInfoMap.get(a.studentId)?.lastname}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ color: '#d46b08' }}>
                  Todos los estudiantes asistieron
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </Modal>
  );
};

export default AttendanceModal;
